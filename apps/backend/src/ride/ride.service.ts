import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateRideDto } from './dto/create-ride.dto';
import { UpdateRideDto } from './dto/update-ride.dto';
import { randomUUID } from 'crypto';

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
          GroupMember: {
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
          id: randomUUID(),
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
          id: randomUUID(),
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
            id: randomUUID(),
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
      // For rides, the driver is the one who "paid" (provided the ride)
      const expense = await tx.expense.create({
        data: {
          id: randomUUID(),
          createdBy: userId,
          paidBy: userId, // Driver paid for the ride (provided the ride)
          description: expenseDescription,
          amount: totalCost,
          currency: 'USD',
          groupId: createRideDto.groupId,
          ExpenseSplit: {
            create: expenseSplits.map((split) => ({
              id: randomUUID(),
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
        UserProfile: { select: { displayName: true } },
      },
    });
    const driverName = driver?.UserProfile?.displayName || driver?.email || 'Someone';

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

  private transformRide(ride: any) {
    const { User, RideParticipant, ...rideBase } = ride;
    
    return {
      ...rideBase,
      date: ride.date.toISOString(),
      createdAt: ride.createdAt.toISOString(),
      driver: User
        ? {
            id: User.id,
            email: User.email,
            profile: User.UserProfile
              ? {
                  displayName: User.UserProfile.displayName,
                  avatarUrl: User.UserProfile.avatarUrl,
                }
              : null,
          }
        : null,
      participants: (RideParticipant || []).map((participant: any) => ({
        id: participant.id,
        rideId: participant.rideId,
        userId: participant.userId,
        isDriver: participant.isDriver,
        createdAt: participant.createdAt.toISOString(),
        user: participant.User
          ? {
              id: participant.User.id,
              email: participant.User.email,
              profile: participant.User.UserProfile
                ? {
                    displayName: participant.User.UserProfile.displayName,
                    avatarUrl: participant.User.UserProfile.avatarUrl,
                  }
                : null,
            }
          : null,
      })),
    };
  }

  async getRides(userId: string, groupId?: string) {
    const where: any = {
      OR: [
        { driverId: userId },
        {
          RideParticipant: {
            some: {
              userId,
            },
          },
        },
      ],
    };

    const rides = await this.prisma.ride.findMany({
      where,
      include: {
        User: {
          select: {
            id: true,
            email: true,
            UserProfile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        RideParticipant: {
          include: {
            User: {
              select: {
                id: true,
                email: true,
                UserProfile: {
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

    // Filter by groupId through the expense relationship if provided
    // Rides are linked to groups via their associated expense (expenseId -> Expense.groupId)
    let filteredRides = rides;
    if (groupId) {
      const expenseIds = await this.prisma.expense.findMany({
        where: { groupId },
        select: { id: true },
      });
      const expenseIdSet = new Set(expenseIds.map(e => e.id));
      filteredRides = rides.filter(ride => ride.expenseId && expenseIdSet.has(ride.expenseId));
    }

    // Transform rides to match frontend interface
    return filteredRides.map(ride => this.transformRide(ride));
  }

  async getRideById(userId: string, rideId: string) {
    const ride = await this.prisma.ride.findFirst({
      where: {
        id: rideId,
        OR: [
          { driverId: userId },
          {
            RideParticipant: {
              some: {
                userId,
              },
            },
          },
        ],
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            UserProfile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        RideParticipant: {
          include: {
            User: {
              select: {
                id: true,
                email: true,
                UserProfile: {
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

    // Check if linked expense still exists (it might have been deleted)
    if (ride.expenseId) {
      const expense = await this.prisma.expense.findUnique({
        where: { id: ride.expenseId },
      });
      
      if (!expense) {
        // Expense was deleted, unlink it from the ride
        await this.prisma.ride.update({
          where: { id: rideId },
          data: { expenseId: null },
        }).catch(err => {
          console.error(`[RideService] Failed to unlink deleted expense from ride ${rideId}:`, err);
        });
        // Set expenseId to null in the ride object
        ride.expenseId = null;
      }
    }

    return this.transformRide(ride);
  }

  async joinRide(userId: string, rideId: string) {
    // Verify ride exists and user is not already a participant
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        RideParticipant: true,
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    // Check if user is already a participant
    const isParticipant = (ride.RideParticipant || []).some((p) => p.userId === userId);
    if (isParticipant) {
      throw new BadRequestException('You are already a participant in this ride');
    }

    // Add user as participant
    await this.prisma.rideParticipant.create({
      data: {
        id: randomUUID(),
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
        include: { ExpenseSplit: true },
      });

      if (expense) {
        // Recalculate splits
        const allParticipants = [
          ride.driverId,
          ...ride.RideParticipant.map((p) => p.userId),
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
          for (const split of expense.ExpenseSplit) {
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
              id: randomUUID(),
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
        UserProfile: { select: { displayName: true } },
      },
    });
    const joinerName = joiner?.UserProfile?.displayName || joiner?.email || 'Someone';

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

  async updateRide(userId: string, rideId: string, updateRideDto: UpdateRideDto) {
    // Verify ride exists and user is the driver
    const ride = await this.prisma.ride.findFirst({
      where: {
        id: rideId,
        driverId: userId,
      },
      include: {
        RideParticipant: true,
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found or you are not the driver');
    }

    // Calculate new total cost if pricing changed
    let totalCost = ride.totalCost;
    if (updateRideDto.chargePerMile !== undefined || updateRideDto.chargePerRide !== undefined || updateRideDto.distance !== undefined) {
      const chargePerMile = updateRideDto.chargePerMile ?? ride.chargePerMile;
      const chargePerRide = updateRideDto.chargePerRide ?? ride.chargePerRide;
      const distance = updateRideDto.distance ?? ride.distance;

      if (chargePerMile && distance) {
        totalCost = chargePerMile * distance;
      } else if (chargePerRide) {
        totalCost = chargePerRide;
      } else {
        throw new BadRequestException('Either chargePerMile with distance or chargePerRide must be provided');
      }
    }

    // Validate passengers if provided
    const passengerIds = updateRideDto.passengerIds;
    if (passengerIds !== undefined) {
      for (const passengerId of passengerIds) {
        if (passengerId === userId) continue; // Skip driver
        
        const user = await this.prisma.user.findUnique({
          where: { id: passengerId },
        });

        if (!user) {
          throw new BadRequestException(`Passenger ${passengerId} not found`);
        }
      }
    }

    // Update ride and recalculate expense splits in a transaction
    const updatedRide = await this.prisma.$transaction(async (tx) => {
      // Update ride
      const updated = await tx.ride.update({
        where: { id: rideId },
        data: {
          type: updateRideDto.type ?? ride.type,
          origin: updateRideDto.origin ?? ride.origin,
          destination: updateRideDto.destination ?? ride.destination,
          distance: updateRideDto.distance ?? ride.distance,
          chargePerMile: updateRideDto.chargePerMile ?? ride.chargePerMile,
          chargePerRide: updateRideDto.chargePerRide ?? ride.chargePerRide,
          totalCost,
          date: updateRideDto.date ? new Date(updateRideDto.date) : ride.date,
        },
      });

      // Update participants if passengerIds provided
      if (passengerIds !== undefined) {
        const uniquePassengerIds = passengerIds.filter((pid) => pid !== userId);
        
        // Remove existing non-driver participants
        await tx.rideParticipant.deleteMany({
          where: {
            rideId,
            isDriver: false,
          },
        });

        // Add new participants
        for (const passengerId of uniquePassengerIds) {
          await tx.rideParticipant.create({
            data: {
              id: randomUUID(),
              rideId,
              userId: passengerId,
              isDriver: false,
            },
          });
        }

        // Recalculate expense splits if expense exists
        if (ride.expenseId) {
          const allParticipants = updated.type === 'rideshare'
            ? [userId, ...uniquePassengerIds]
            : uniquePassengerIds;
          const participantCount = updated.type === 'rideshare' 
            ? allParticipants.length 
            : uniquePassengerIds.length;

          const costPerPerson = participantCount > 0 
            ? totalCost / participantCount 
            : 0;

          // Delete existing splits
          await tx.expenseSplit.deleteMany({
            where: { expenseId: ride.expenseId },
          });

          // Create new splits
          const expenseSplits = updated.type === 'rideshare'
            ? allParticipants.map((pid) => ({
                userId: pid,
                amount: costPerPerson,
              }))
            : uniquePassengerIds.map((pid) => ({
                userId: pid,
                amount: costPerPerson,
              }));

          for (const split of expenseSplits) {
            await tx.expenseSplit.create({
              data: {
                id: randomUUID(),
                expenseId: ride.expenseId!,
                userId: split.userId,
                amount: split.amount,
                isPaid: false,
              },
            });
          }

          // Update expense amount and ensure paidBy is set (driver paid for the ride)
          await tx.expense.update({
            where: { id: ride.expenseId },
            data: {
              amount: totalCost,
              description: `Ride: ${updated.origin} → ${updated.destination}`,
              paidBy: userId, // Driver paid for the ride (provided the ride)
            },
          });
        }
      } else if (totalCost !== ride.totalCost && ride.expenseId) {
        // Only cost changed, update expense and recalculate splits
        const currentParticipants = await tx.rideParticipant.findMany({
          where: { rideId },
        });

        const allParticipants = updated.type === 'rideshare'
          ? currentParticipants.map((p) => p.userId)
          : currentParticipants.filter((p) => !p.isDriver).map((p) => p.userId);
        const participantCount = updated.type === 'rideshare' 
          ? allParticipants.length 
          : allParticipants.length;

        const costPerPerson = participantCount > 0 
          ? totalCost / participantCount 
          : 0;

        // Update all splits
        const splits = await tx.expenseSplit.findMany({
          where: { expenseId: ride.expenseId },
        });

        for (const split of splits) {
          const shouldPay = updated.type === 'rideshare' || split.userId !== userId;
          await tx.expenseSplit.update({
            where: { id: split.id },
            data: {
              amount: shouldPay ? costPerPerson : 0,
            },
          });
        }

        // Update expense amount and ensure paidBy is set (driver paid for the ride)
        await tx.expense.update({
          where: { id: ride.expenseId },
          data: {
            amount: totalCost,
            description: `Ride: ${updated.origin} → ${updated.destination}`,
            paidBy: userId, // Driver paid for the ride (provided the ride)
          },
        });
      }

      return updated;
    });

    // Notify participants about the update
    const driver = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        UserProfile: { select: { displayName: true } },
      },
    });
    const driverName = driver?.UserProfile?.displayName || driver?.email || 'Someone';

    const participants = await this.prisma.rideParticipant.findMany({
      where: { rideId, userId: { not: userId } },
      include: { User: { select: { id: true } } },
    });

    for (const participant of participants) {
      await this.notificationService.notifyRideUpdated(
        participant.userId,
        rideId,
        updatedRide.origin,
        updatedRide.destination,
        driverName,
      ).catch(err => {
        console.error(`Failed to create notification for participant ${participant.userId}:`, err);
      });
    }

    return this.getRideById(userId, rideId);
  }

  async deleteRide(userId: string, rideId: string) {
    // Verify ride exists and user is the driver
    const ride = await this.prisma.ride.findFirst({
      where: {
        id: rideId,
        driverId: userId,
      },
      include: {
        RideParticipant: {
          include: {
            User: {
              select: {
                id: true,
                email: true,
                UserProfile: { select: { displayName: true } },
              },
            },
          },
        },
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found or you are not the driver');
    }

    // Get driver info for notifications
    const driver = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        UserProfile: { select: { displayName: true } },
      },
    });
    const driverName = driver?.UserProfile?.displayName || driver?.email || 'Someone';

    // Get participant IDs before deletion
    const participantIds = ride.RideParticipant
      .filter((p) => !p.isDriver)
      .map((p) => p.userId);

    // Delete ride (cascade will handle participants and expense link)
    // Note: We don't delete the expense itself, just the link
    await this.prisma.$transaction(async (tx) => {
      // Remove expense link
      await tx.ride.update({
        where: { id: rideId },
        data: { expenseId: null },
      });

      // Delete ride (cascade deletes participants)
      await tx.ride.delete({
        where: { id: rideId },
      });
    });

    // Notify participants about cancellation
    for (const participantId of participantIds) {
      await this.notificationService.notifyRideCancelled(
        participantId,
        rideId,
        ride.origin,
        ride.destination,
        driverName,
      ).catch(err => {
        console.error(`Failed to create notification for participant ${participantId}:`, err);
      });
    }

    return { message: 'Ride deleted successfully' };
  }

  async getRideHistory(userId: string, rideId: string) {
    // Verify ride exists and user has access
    const ride = await this.prisma.ride.findFirst({
      where: {
        id: rideId,
        OR: [
          { driverId: userId },
          {
            RideParticipant: {
              some: {
                userId,
              },
            },
          },
        ],
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found or you do not have access');
    }

    // Get expense history if linked
    const history: any[] = [];

    // Add ride creation
    history.push({
      type: 'created',
      timestamp: ride.createdAt,
      description: 'Ride created',
      user: null,
    });

    // Add expense history if exists
    if (ride.expenseId) {
      const expense = await this.prisma.expense.findUnique({
        where: { id: ride.expenseId },
        include: {
          ExpenseSplit: {
            include: {
              User: {
                select: {
                  id: true,
                  email: true,
                  UserProfile: {
                    select: {
                      displayName: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
              SettlementSplit: {
                include: {
                  Settlement: true,
                },
              },
            },
          },
          ExpenseHistory: {
            where: {
              action: 'settled',
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (expense) {
        // Add expense creation
        history.push({
          type: 'expense_created',
          timestamp: expense.createdAt,
          description: 'Expense created for ride',
          user: null,
        });

        // Add split payments
        for (const split of expense.ExpenseSplit) {
          if (split.isPaid) {
            history.push({
              type: 'split_paid',
              timestamp: split.paidAt || split.createdAt,
              description: `${split.User.UserProfile?.displayName || split.User.email} paid their share`,
              user: split.User,
            });
          }
        }

        // Add expense settlements from history
        if (expense.ExpenseHistory && expense.ExpenseHistory.length > 0) {
          for (const historyEntry of expense.ExpenseHistory) {
            history.push({
              type: 'expense_settled',
              timestamp: historyEntry.createdAt,
              description: 'Expense settled',
              user: null,
            });
          }
        }
      }
    }

    // Sort by timestamp
    history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return history;
  }
}

