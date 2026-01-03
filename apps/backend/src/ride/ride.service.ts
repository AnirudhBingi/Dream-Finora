import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateRideDto } from './dto/create-ride.dto';

@Injectable()
export class RideService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async createRide(userId: string, createRideDto: CreateRideDto) {
    // Validate that either chargePerMile or chargePerRide is provided
    if (!createRideDto.chargePerMile && !createRideDto.chargePerRide) {
      throw new BadRequestException('Either chargePerMile or chargePerRide must be provided');
    }

    // Calculate total cost
    let totalCost = 0;
    if (createRideDto.chargePerMile && createRideDto.distance) {
      totalCost = createRideDto.chargePerMile * createRideDto.distance;
    } else if (createRideDto.chargePerRide) {
      totalCost = createRideDto.chargePerRide;
    }

    // Validate group if provided
    if (createRideDto.groupId) {
      const group = await this.prisma.group.findFirst({
        where: {
          id: createRideDto.groupId,
          members: {
            some: {
              userId,
            },
          },
        },
      });

      if (!group) {
        throw new BadRequestException('Group not found or you are not a member');
      }
    }

    // Validate passengers if provided
    const passengerIds = createRideDto.passengerIds || [];
    if (passengerIds.length > 0) {
      for (const passengerId of passengerIds) {
        const user = await this.prisma.user.findUnique({
          where: { id: passengerId },
        });

        if (!user) {
          throw new BadRequestException(`Passenger ${passengerId} not found`);
        }

        // If group is provided, verify passenger is in group
        if (createRideDto.groupId) {
          const isMember = await this.prisma.groupMember.findUnique({
            where: {
              groupId_userId: {
                groupId: createRideDto.groupId,
                userId: passengerId,
              },
            },
          });

          if (!isMember) {
            throw new BadRequestException(`Passenger ${passengerId} is not a member of the group`);
          }
        }
      }
    }

    // Filter out driver from passengerIds to avoid duplicates
    const uniquePassengerIds = passengerIds.filter((pid) => pid !== userId);
    
    // Determine how to split cost
    const allParticipants = createRideDto.type === 'rideshare'
      ? [userId, ...uniquePassengerIds]
      : uniquePassengerIds;
    const participantCount = createRideDto.type === 'rideshare' 
      ? allParticipants.length 
      : uniquePassengerIds.length; // For giveRide, driver doesn't pay

    const costPerPerson = participantCount > 0 
      ? totalCost / participantCount 
      : 0;

    // Create ride and participants in a transaction
    const ride = await this.prisma.$transaction(async (tx) => {
      // Create ride
      const newRide = await tx.ride.create({
        data: {
          driverId: userId,
          type: createRideDto.type,
          origin: createRideDto.origin,
          destination: createRideDto.destination,
          distance: createRideDto.distance,
          chargePerMile: createRideDto.chargePerMile,
          chargePerRide: createRideDto.chargePerRide,
          totalCost,
          currency: 'USD',
          date: createRideDto.date ? new Date(createRideDto.date) : new Date(),
        },
      });

      // Add driver as participant
      await tx.rideParticipant.create({
        data: {
          rideId: newRide.id,
          userId,
          isDriver: true,
        },
      });

      // Add passengers as participants (filter out driver to avoid duplicate)
      const uniquePassengerIds = passengerIds.filter((pid) => pid !== userId);
      for (const passengerId of uniquePassengerIds) {
        await tx.rideParticipant.create({
          data: {
            rideId: newRide.id,
            userId: passengerId,
            isDriver: false,
          },
        });
      }

      // Auto-create expense in expense splitting
      const expenseDescription = `Ride: ${createRideDto.origin} → ${createRideDto.destination}`;
      
      // Create expense splits
      const expenseSplits = createRideDto.type === 'rideshare'
        ? allParticipants.map((pid) => ({
            userId: pid,
            amount: costPerPerson,
          }))
        : uniquePassengerIds.map((pid) => ({
            userId: pid,
            amount: costPerPerson,
          }));

      // Create expense directly in transaction
      const expense = await tx.expense.create({
        data: {
          createdBy: userId,
          description: expenseDescription,
          amount: totalCost,
          currency: 'USD',
          groupId: createRideDto.groupId,
          splits: {
            create: expenseSplits.map((split) => ({
              userId: split.userId,
              amount: split.amount,
              isPaid: false,
            })),
          },
        },
      });

      // Link expense to ride
      await tx.ride.update({
        where: { id: newRide.id },
        data: { expenseId: expense.id },
      });

      return { ...newRide, expenseId: expense.id };
    });

    // Notify passengers about the ride
    const driver = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        profile: { select: { displayName: true } },
      },
    });
    const driverName = driver?.profile?.displayName || driver?.email || 'Someone';

    for (const passengerId of uniquePassengerIds) {
      await this.notificationService.notifyRideCreated(
        passengerId,
        ride.id,
        createRideDto.origin,
        createRideDto.destination,
        driverName,
      ).catch(err => {
        console.error(`Failed to create notification for passenger ${passengerId}:`, err);
      });
    }

    // Fetch ride with all relations
    return this.getRideById(userId, ride.id);
  }

  async getRides(userId: string, groupId?: string) {
    const where: any = {
      OR: [
        { driverId: userId },
        {
          participants: {
            some: {
              userId,
            },
          },
        },
      ],
    };

    if (groupId) {
      where.groupId = groupId;
    }

    const rides = await this.prisma.ride.findMany({
      where,
      include: {
        driver: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return rides;
  }

  async getRideById(userId: string, rideId: string) {
    const ride = await this.prisma.ride.findFirst({
      where: {
        id: rideId,
        OR: [
          { driverId: userId },
          {
            participants: {
              some: {
                userId,
              },
            },
          },
        ],
      },
      include: {
        driver: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    return ride;
  }

  async joinRide(userId: string, rideId: string) {
    // Verify ride exists and user is not already a participant
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        participants: true,
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    // Check if user is already a participant
    const isParticipant = ride.participants.some((p) => p.userId === userId);
    if (isParticipant) {
      throw new BadRequestException('You are already a participant in this ride');
    }

    // Add user as participant
    await this.prisma.rideParticipant.create({
      data: {
        rideId,
        userId,
        isDriver: false,
      },
    });

    // Recalculate and update expense splits if expense exists
    if (ride.expenseId) {
      // Get current expense
      const expense = await this.prisma.expense.findUnique({
        where: { id: ride.expenseId },
        include: { splits: true },
      });

      if (expense) {
        // Recalculate splits
        const allParticipants = [
          ride.driverId,
          ...ride.participants.map((p) => p.userId),
          userId,
        ];
        const participantCount = ride.type === 'rideshare' 
          ? allParticipants.length 
          : allParticipants.length - 1; // Exclude driver for giveRide

        const costPerPerson = participantCount > 0 
          ? ride.totalCost / participantCount 
          : 0;

        // Update existing splits and add new one
        await this.prisma.$transaction(async (tx) => {
          // Update existing splits
          for (const split of expense.splits) {
            const shouldPay = ride.type === 'rideshare' || split.userId !== ride.driverId;
            await tx.expenseSplit.update({
              where: { id: split.id },
              data: {
                amount: shouldPay ? costPerPerson : 0,
              },
            });
          }

          // Add new split for the new participant
          const shouldPay = ride.type === 'rideshare' || userId !== ride.driverId;
          await tx.expenseSplit.create({
            data: {
              expenseId: ride.expenseId!,
              userId,
              amount: shouldPay ? costPerPerson : 0,
            },
          });
        });
      }
    }

    // Notify driver that someone joined
    const joiner = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        profile: { select: { displayName: true } },
      },
    });
    const joinerName = joiner?.profile?.displayName || joiner?.email || 'Someone';

    if (ride.driverId !== userId) {
      await this.notificationService.notifyRideJoined(
        ride.driverId,
        rideId,
        ride.origin,
        ride.destination,
        joinerName,
      ).catch(err => {
        console.error(`Failed to create notification for driver:`, err);
      });
    }

    return this.getRideById(userId, rideId);
  }
}

