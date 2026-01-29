import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { FinanceService } from '../finance/finance.service';
import { CreateRideDto } from './dto/create-ride.dto';
import { UpdateRideDto } from './dto/update-ride.dto';
import {
  CreateRideFavoriteDto,
  UpdateRideFavoriteDto,
} from './dto/create-ride-favorite.dto';
import { randomUUID } from 'crypto';

type RideParticipantWithUser = Prisma.RideParticipantGetPayload<{
  include: {
    User: {
      select: {
        id: true;
        email: true;
        UserProfile: {
          select: {
            displayName: true;
            avatarUrl: true;
          };
        };
      };
    };
  };
}>;

type RideWithRelations = Prisma.RideGetPayload<{
  include: {
    User: {
      select: {
        id: true;
        email: true;
        UserProfile: {
          select: {
            displayName: true;
            avatarUrl: true;
          };
        };
      };
    };
    RideParticipant: {
      include: {
        User: {
          select: {
            id: true;
            email: true;
            UserProfile: {
              select: {
                displayName: true;
                avatarUrl: true;
              };
            };
          };
        };
      };
    };
  };
}>;

type RideHistoryEntry = {
  type: string;
  timestamp: Date;
  description: string;
  user: {
    id: string;
    email: string;
    profile: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  } | null;
};

@Injectable()
export class RideService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    @Inject(forwardRef(() => FinanceService))
    private financeService: FinanceService,
  ) {}

  async createRide(userId: string, createRideDto: CreateRideDto) {
    // Validate that either chargePerMile or chargePerRide is provided
    if (!createRideDto.chargePerMile && !createRideDto.chargePerRide) {
      throw new BadRequestException(
        'Either chargePerMile or chargePerRide must be provided',
      );
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
        throw new BadRequestException(
          'Group not found or you are not a member',
        );
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
            throw new BadRequestException(
              `Passenger ${passengerId} is not a member of the group`,
            );
          }
        }
      }
    }

    // Filter out driver from passengerIds to avoid duplicates
    const uniquePassengerIds = passengerIds.filter((pid) => pid !== userId);

    // Determine how to split cost
    // For "Charge Riders" (giveRide): Each passenger pays the FULL totalCost (driver charges each passenger individually)
    // For "Split Cost" (rideshare): Cost is split equally among all participants including driver
    const allParticipants =
      createRideDto.type === 'rideshare'
        ? [userId, ...uniquePassengerIds]
        : uniquePassengerIds;
    const participantCount =
      createRideDto.type === 'rideshare'
        ? allParticipants.length
        : uniquePassengerIds.length; // For giveRide, driver doesn't pay

    // Calculate cost per person
    // For giveRide: Each passenger pays the full amount (totalCost), not split
    // For rideshare: Split the cost equally among all participants
    const costPerPerson =
      createRideDto.type === 'giveRide'
        ? totalCost // Each passenger pays the full amount for Charge Riders
        : participantCount > 0
          ? totalCost / participantCount
          : 0; // Split equally for rideshare

    // Create ride and participants in a transaction
    const transactionResult = await this.prisma.$transaction(async (tx) => {
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
      // Use the uniquePassengerIds from outer scope (line 81) to avoid shadowing issues
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
      // For "Charge Riders" (giveRide): Each passenger pays the FULL totalCost (driver charges each passenger individually)
      // For "Split Cost" (rideshare): Split totalCost equally among all participants (including driver)
      let expenseSplits: Array<{ userId: string; amount: number }>;

      if (createRideDto.type === 'giveRide') {
        // Charge Riders: Each passenger pays the FULL amount (NOT split!)
        expenseSplits = uniquePassengerIds.map((pid) => ({
          userId: pid,
          amount: totalCost, // Each passenger pays the FULL amount
        }));
      } else {
        // Split Cost (rideshare): Split equally among all participants including driver
        expenseSplits = allParticipants.map((pid) => ({
          userId: pid,
          amount: costPerPerson, // Split amount (totalCost / participantCount)
        }));
      }

      // Create expense directly in transaction
      // For rides, the driver is the one who "paid" (provided the ride)
      // Category is set to "Transportation" for ride expenses
      // For "Charge Riders" (giveRide): Expense amount = totalCost * passengerCount (total collected from all passengers)
      // For "Split Cost" (rideshare): Expense amount = totalCost (amount to be split)
      const expenseAmount =
        createRideDto.type === 'giveRide'
          ? totalCost * uniquePassengerIds.length // Total collected: each passenger pays full amount
          : totalCost; // Total amount to split among participants

      const expense = await tx.expense.create({
        data: {
          id: randomUUID(),
          createdBy: userId,
          paidBy: userId, // Driver paid for the ride (provided the ride)
          description: expenseDescription,
          amount: expenseAmount,
          currency: 'USD',
          category: 'Transportation', // Set category for ride expenses
          groupId: createRideDto.groupId,
          rideId: newRide.id, // Bidirectional link: expense knows which ride created it
          ExpenseSplit: {
            create: expenseSplits.map((split) => ({
              id: randomUUID(),
              userId: split.userId,
              amount: split.amount,
              isPaid: false,
            })),
          },
        },
        include: {
          ExpenseSplit: true,
        },
      });

      // Link expense to ride (for backward compatibility with existing code)
      await tx.ride.update({
        where: { id: newRide.id },
        data: { expenseId: expense.id },
      });

      return { newRide, expense };
    });

    const ride = transactionResult.newRide;
    const expense = transactionResult.expense;

    // Sync expense splits to personal finance (after transaction completes)
    // For rideshare, driver is included in splits; for giveRide, driver is excluded
    if (expense && expense.ExpenseSplit) {
      const expenseDescription = `Ride: ${createRideDto.origin} → ${createRideDto.destination}`;

      await Promise.all(
        expense.ExpenseSplit.map(async (split) => {
          if (split.amount > 0) {
            // User owes money - create expense transaction in local finance
            try {
              await this.financeService.syncExpenseSplitToFinance(
                split.id,
                split.userId,
                {
                  amount: split.amount,
                  category: 'Transportation',
                  description: expenseDescription,
                  date: expense.date,
                  currency: expense.currency,
                },
              );
            } catch (err) {
              console.error(
                `[RideService] Failed to sync ride expense split ${split.id} to finance:`,
                err,
              );
              // Don't fail ride creation if finance sync fails
            }
          }
        }),
      );
    }

    // Notify passengers about the ride
    const driver = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        UserProfile: { select: { displayName: true } },
      },
    });
    const driverName =
      driver?.UserProfile?.displayName || driver?.email || 'Someone';

    for (const passengerId of uniquePassengerIds) {
      await this.notificationService
        .notifyRideCreated(
          passengerId,
          ride.id,
          createRideDto.origin,
          createRideDto.destination,
          driverName,
        )
        .catch((err) => {
          console.error(
            `Failed to create notification for passenger ${passengerId}:`,
            err,
          );
        });
    }

    // Fetch ride with all relations
    return this.getRideById(userId, ride.id);
  }

  private transformRide(ride: RideWithRelations) {
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
      participants: (RideParticipant || []).map(
        (participant: RideParticipantWithUser) => ({
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
        }),
      ),
    };
  }

  async getRides(userId: string, groupId?: string) {
    const where: Prisma.RideWhereInput = {
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
      const expenseIdSet = new Set(expenseIds.map((e) => e.id));
      filteredRides = rides.filter(
        (ride) => ride.expenseId && expenseIdSet.has(ride.expenseId),
      );
    }

    // Transform rides to match frontend interface
    return filteredRides.map((ride) => this.transformRide(ride));
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
        await this.prisma.ride
          .update({
            where: { id: rideId },
            data: { expenseId: null },
          })
          .catch((err) => {
            console.error(
              `[RideService] Failed to unlink deleted expense from ride ${rideId}:`,
              err,
            );
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
    const isParticipant = (ride.RideParticipant || []).some(
      (p) => p.userId === userId,
    );
    if (isParticipant) {
      throw new BadRequestException(
        'You are already a participant in this ride',
      );
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
        // Calculate cost per person
        // For "Charge Riders" (giveRide): Each passenger pays the FULL totalCost (driver charges each individually)
        // For "Split Cost" (rideshare): Cost is split equally among all participants including driver
        const existingPassengers = ride.RideParticipant.filter(
          (p) => !p.isDriver,
        ).map((p) => p.userId);
        const allPassengersAfterJoin = [...existingPassengers, userId]; // All passengers after new one joins

        const costPerPerson =
          ride.type === 'giveRide'
            ? ride.totalCost // Each passenger pays the full amount for Charge Riders
            : allParticipants.length > 0
              ? ride.totalCost / allParticipants.length
              : 0; // Split equally for rideshare

        // Update existing splits and add new one in transaction
        await this.prisma.$transaction(async (tx) => {
          // For giveRide: Each passenger (excluding driver) pays full amount
          // For rideshare: Recalculate splits for all participants including driver
          if (ride.type === 'giveRide') {
            // For Charge Riders: Existing passengers should already be paying full amount
            // Only add the new passenger's split (they pay full amount)
            // Note: We don't update existing splits as they should already be correct
            // (If they're not correct due to old buggy code, that's a data migration issue)

            // Add new split for the new participant (they pay full amount)
            await tx.expenseSplit.create({
              data: {
                id: randomUUID(),
                expenseId: expense.id,
                userId,
                amount: ride.totalCost, // New passenger pays full amount
              },
            });

            // Update expense amount: totalCost * currentPassengerCount (all passengers pay full amount)
            // This ensures consistency even if expense amount was incorrect before
            const passengerCountAfterJoin = allPassengersAfterJoin.length; // All passengers including the new one
            await tx.expense.update({
              where: { id: expense.id },
              data: {
                amount: ride.totalCost * passengerCountAfterJoin,
              },
            });
          } else {
            // For rideshare: Recalculate splits equally among all participants
            // When a new passenger joins, everyone's share changes, so update all splits
            for (const split of expense.ExpenseSplit) {
              await tx.expenseSplit.update({
                where: { id: split.id },
                data: {
                  amount: costPerPerson, // Split equally among all
                },
              });
            }

            // Add new split for the new participant
            await tx.expenseSplit.create({
              data: {
                id: randomUUID(),
                expenseId: expense.id,
                userId,
                amount: costPerPerson, // Split equally
              },
            });

            // For rideshare: Expense amount remains totalCost (it's the amount to be split)
            // No need to update expense amount as it's already correct
          }
        });

        // Sync all splits to finance (after transaction completes)
        const allSplits = await this.prisma.expenseSplit.findMany({
          where: { expenseId: ride.expenseId },
        });

        const expenseDescription = `Ride: ${ride.origin} → ${ride.destination}`;
        await Promise.all(
          allSplits.map(async (split) => {
            if (split.amount > 0) {
              try {
                await this.financeService.syncExpenseSplitToFinance(
                  split.id,
                  split.userId,
                  {
                    amount: split.amount,
                    category: 'Transportation',
                    description: expenseDescription,
                    date: expense.date,
                    currency: expense.currency,
                  },
                );
              } catch (err) {
                console.error(
                  `[RideService] Failed to sync ride expense split ${split.id} to finance after join:`,
                  err,
                );
                // Don't fail join if finance sync fails
              }
            }
          }),
        );
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
    const joinerName =
      joiner?.UserProfile?.displayName || joiner?.email || 'Someone';

    if (ride.driverId !== userId) {
      await this.notificationService
        .notifyRideJoined(
          ride.driverId,
          rideId,
          ride.origin,
          ride.destination,
          joinerName,
        )
        .catch((err) => {
          console.error(`Failed to create notification for driver:`, err);
        });
    }

    return this.getRideById(userId, rideId);
  }

  async updateRide(
    userId: string,
    rideId: string,
    updateRideDto: UpdateRideDto,
  ) {
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
    if (
      updateRideDto.chargePerMile !== undefined ||
      updateRideDto.chargePerRide !== undefined ||
      updateRideDto.distance !== undefined
    ) {
      const chargePerMile = updateRideDto.chargePerMile ?? ride.chargePerMile;
      const chargePerRide = updateRideDto.chargePerRide ?? ride.chargePerRide;
      const distance = updateRideDto.distance ?? ride.distance;

      if (chargePerMile && distance) {
        totalCost = chargePerMile * distance;
      } else if (chargePerRide) {
        totalCost = chargePerRide;
      } else {
        throw new BadRequestException(
          'Either chargePerMile with distance or chargePerRide must be provided',
        );
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

    // Get old splits BEFORE transaction (if passengerIds are changing) to delete finance transactions after
    let oldSplitIds: string[] = [];
    if (passengerIds !== undefined && ride.expenseId) {
      const oldSplits = await this.prisma.expenseSplit.findMany({
        where: { expenseId: ride.expenseId },
      });
      oldSplitIds = oldSplits.map((split) => split.id);
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

      const expenseDescription = `Ride: ${updated.origin} → ${updated.destination}`;

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
          const allParticipants =
            updated.type === 'rideshare'
              ? [userId, ...uniquePassengerIds]
              : uniquePassengerIds;
          // Calculate cost per person
          // For "Charge Riders" (giveRide): Each passenger pays the FULL totalCost (driver charges each individually)
          // For "Split Cost" (rideshare): Cost is split equally among all participants including driver
          const costPerPerson =
            updated.type === 'giveRide'
              ? totalCost // Each passenger pays the full amount for Charge Riders
              : allParticipants.length > 0
                ? totalCost / allParticipants.length
                : 0; // Split equally for rideshare

          // Delete existing splits (will be recreated)
          await tx.expenseSplit.deleteMany({
            where: { expenseId: ride.expenseId },
          });

          // Create new splits
          const expenseSplits =
            updated.type === 'rideshare'
              ? allParticipants.map((pid) => ({
                  userId: pid,
                  amount: costPerPerson, // Split amount (totalCost / participantCount)
                }))
              : uniquePassengerIds.map((pid) => ({
                  userId: pid,
                  amount: totalCost, // Each passenger pays the FULL amount for Charge Riders
                }));

          for (const split of expenseSplits) {
            await tx.expenseSplit.create({
              data: {
                id: randomUUID(),
                expenseId: ride.expenseId,
                userId: split.userId,
                amount: split.amount,
                isPaid: false,
              },
            });
          }

          // Update expense amount and ensure paidBy is set (driver paid for the ride)
          // For "Charge Riders" (giveRide): Expense amount = totalCost * passengerCount (total collected from all passengers)
          // For "Split Cost" (rideshare): Expense amount = totalCost (amount to be split)
          const expenseAmount =
            updated.type === 'giveRide'
              ? totalCost * uniquePassengerIds.length // Total collected: each passenger pays full amount
              : totalCost; // Total amount to split among participants

          await tx.expense.update({
            where: { id: ride.expenseId },
            data: {
              amount: expenseAmount,
              description: expenseDescription,
              category: 'Transportation', // Ensure category is set
              paidBy: userId, // Driver paid for the ride (provided the ride)
            },
          });
        }
      } else if (totalCost !== ride.totalCost && ride.expenseId) {
        // Only cost changed, update expense and recalculate splits
        const currentParticipants = await tx.rideParticipant.findMany({
          where: { rideId },
        });

        const allParticipants =
          updated.type === 'rideshare'
            ? currentParticipants.map((p) => p.userId)
            : currentParticipants
                .filter((p) => !p.isDriver)
                .map((p) => p.userId);
        // Calculate cost per person
        // For "Charge Riders" (giveRide): Each passenger pays the FULL totalCost (driver charges each individually)
        // For "Split Cost" (rideshare): Cost is split equally among all participants including driver
        const passengerIds = currentParticipants
          .filter((p) => p.userId !== userId) // Exclude driver
          .map((p) => p.userId);

        const costPerPerson =
          updated.type === 'giveRide'
            ? totalCost // Each passenger pays the full amount for Charge Riders
            : allParticipants.length > 0
              ? totalCost / allParticipants.length
              : 0; // Split equally for rideshare

        // Update all splits
        const splits = await tx.expenseSplit.findMany({
          where: { expenseId: ride.expenseId },
        });

        for (const split of splits) {
          if (updated.type === 'giveRide') {
            // For Charge Riders: Driver pays 0, all passengers pay full amount
            const isDriver = split.userId === userId;
            await tx.expenseSplit.update({
              where: { id: split.id },
              data: {
                amount: isDriver ? 0 : totalCost, // Each passenger pays full amount
              },
            });
          } else {
            // For Split Cost: Everyone pays split amount
            await tx.expenseSplit.update({
              where: { id: split.id },
              data: {
                amount: costPerPerson,
              },
            });
          }
        }

        // Update expense amount and ensure paidBy is set (driver paid for the ride)
        // For "Charge Riders" (giveRide): Expense amount = totalCost * passengerCount (total collected from all passengers)
        // For "Split Cost" (rideshare): Expense amount = totalCost (amount to be split)
        const expenseAmount =
          updated.type === 'giveRide'
            ? totalCost * passengerIds.length // Total collected: each passenger pays full amount
            : totalCost; // Total amount to split among participants

        await tx.expense.update({
          where: { id: ride.expenseId },
          data: {
            amount: expenseAmount,
            description: expenseDescription,
            category: 'Transportation', // Ensure category is set
            paidBy: userId, // Driver paid for the ride (provided the ride)
          },
        });
      } else if (
        ride.expenseId &&
        (updateRideDto.origin || updateRideDto.destination)
      ) {
        // Route changed, update expense description
        await tx.expense.update({
          where: { id: ride.expenseId },
          data: {
            description: expenseDescription,
          },
        });
      }

      return updated;
    });

    // Handle finance transactions after transaction completes
    // Delete finance transactions for removed splits (when passengerIds changed and splits were recreated)
    if (
      passengerIds !== undefined &&
      ride.expenseId &&
      oldSplitIds.length > 0
    ) {
      for (const oldSplitId of oldSplitIds) {
        try {
          await this.financeService.deleteExpenseSplitFinanceTransaction(
            oldSplitId,
          );
        } catch (err) {
          console.error(
            `[RideService] Failed to delete finance transaction for old split ${oldSplitId}:`,
            err,
          );
          // Continue even if deletion fails
        }
      }
    }

    // Sync updated splits to personal finance (after transaction completes)
    // Sync if splits changed (passengerIds changed and splits were recreated) OR if only cost changed (splits were updated)
    if (
      ride.expenseId &&
      (passengerIds !== undefined || totalCost !== ride.totalCost)
    ) {
      // Get updated expense with splits
      const expense = await this.prisma.expense.findUnique({
        where: { id: ride.expenseId },
        include: { ExpenseSplit: true },
      });

      if (expense) {
        const expenseDescription = `Ride: ${updatedRide.origin} → ${updatedRide.destination}`;

        // Sync finance transactions for all current splits
        // For new splits (when passengerIds changed): This will create new finance transactions
        // For updated splits (when only cost changed): This will update existing finance transactions
        await Promise.all(
          expense.ExpenseSplit.map(async (split) => {
            if (split.amount > 0) {
              try {
                await this.financeService.syncExpenseSplitToFinance(
                  split.id,
                  split.userId,
                  {
                    amount: split.amount,
                    category: 'Transportation',
                    description: expenseDescription,
                    date: expense.date,
                    currency: expense.currency,
                  },
                );
              } catch (err) {
                console.error(
                  `[RideService] Failed to sync ride expense split ${split.id} to finance after update:`,
                  err,
                );
                // Don't fail ride update if finance sync fails
              }
            }
          }),
        );
      }
    }

    // Notify participants about the update
    const driver = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        UserProfile: { select: { displayName: true } },
      },
    });
    const driverName =
      driver?.UserProfile?.displayName || driver?.email || 'Someone';

    const participants = await this.prisma.rideParticipant.findMany({
      where: { rideId, userId: { not: userId } },
      include: { User: { select: { id: true } } },
    });

    for (const participant of participants) {
      await this.notificationService
        .notifyRideUpdated(
          participant.userId,
          rideId,
          updatedRide.origin,
          updatedRide.destination,
          driverName,
        )
        .catch((err) => {
          console.error(
            `Failed to create notification for participant ${participant.userId}:`,
            err,
          );
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
    const driverName =
      driver?.UserProfile?.displayName || driver?.email || 'Someone';

    // Get participant IDs before deletion
    const participantIds = ride.RideParticipant.filter((p) => !p.isDriver).map(
      (p) => p.userId,
    );

    // Get expense splits BEFORE transaction (to delete finance transactions after)
    let expenseSplitIds: string[] = [];
    if (ride.expenseId) {
      const expense = await this.prisma.expense.findUnique({
        where: { id: ride.expenseId },
        include: { ExpenseSplit: true },
      });

      if (expense) {
        expenseSplitIds = expense.ExpenseSplit.map((split) => split.id);
      }
    }

    // Delete ride and associated expense/splits in a transaction
    await this.prisma.$transaction(async (tx) => {
      // If ride has an associated expense, delete it and its splits
      if (ride.expenseId) {
        // Delete all expense splits first (cascade would handle this, but being explicit)
        await tx.expenseSplit.deleteMany({
          where: { expenseId: ride.expenseId },
        });

        // Delete the expense itself
        await tx.expense.delete({
          where: { id: ride.expenseId },
        });
      }

      // Delete ride (cascade deletes participants)
      await tx.ride.delete({
        where: { id: rideId },
      });
    });

    // Delete finance transactions linked to deleted splits (after transaction to ensure expense is deleted)
    // This also updates budget tracking
    for (const splitId of expenseSplitIds) {
      try {
        await this.financeService.deleteExpenseSplitFinanceTransaction(splitId);
      } catch (err) {
        console.error(
          `[RideService] Failed to delete finance transaction for split ${splitId}:`,
          err,
        );
        // Continue with deletion even if finance transaction deletion fails
      }
    }

    // Notify participants about cancellation
    for (const participantId of participantIds) {
      await this.notificationService
        .notifyRideCancelled(
          participantId,
          rideId,
          ride.origin,
          ride.destination,
          driverName,
        )
        .catch((err) => {
          console.error(
            `Failed to create notification for participant ${participantId}:`,
            err,
          );
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
    const history: RideHistoryEntry[] = [];

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
              user: {
                id: split.User.id,
                email: split.User.email,
                profile: split.User.UserProfile
                  ? {
                      displayName: split.User.UserProfile.displayName,
                      avatarUrl: split.User.UserProfile.avatarUrl,
                    }
                  : null,
              },
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
    history.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    return history;
  }

  /**
   * Get all favorite rides for a user
   */
  async getFavoriteRides(userId: string) {
    const favorites = await this.prisma.rideFavorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with passenger user details
    const favoritesWithPassengers = await Promise.all(
      favorites.map(async (favorite) => {
        const passengers = await Promise.all(
          favorite.passengerIds.map(async (passengerId) => {
            const user = await this.prisma.user.findUnique({
              where: { id: passengerId },
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
            });
            return user
              ? {
                  id: user.id,
                  email: user.email,
                  displayName: user.UserProfile?.displayName || user.email,
                  avatarUrl: user.UserProfile?.avatarUrl || null,
                }
              : null;
          }),
        );

        return {
          id: favorite.id,
          name: favorite.name,
          passengerIds: favorite.passengerIds,
          passengers: passengers.filter((p) => p !== null),
          chargePerMile: favorite.chargePerMile,
          chargePerRide: favorite.chargePerRide,
          origin: favorite.origin,
          destination: favorite.destination,
          groupId: favorite.groupId,
          createdAt: favorite.createdAt.toISOString(),
          updatedAt: favorite.updatedAt.toISOString(),
        };
      }),
    );

    return favoritesWithPassengers;
  }

  /**
   * Create a favorite ride template
   */
  async createFavoriteRide(
    userId: string,
    createFavoriteDto: CreateRideFavoriteDto,
  ) {
    // Validate that either chargePerMile or chargePerRide is provided
    if (!createFavoriteDto.chargePerMile && !createFavoriteDto.chargePerRide) {
      throw new BadRequestException(
        'Either chargePerMile or chargePerRide must be provided',
      );
    }

    // Filter out driver from passengerIds
    const uniquePassengerIds = createFavoriteDto.passengerIds.filter(
      (pid) => pid !== userId,
    );

    if (uniquePassengerIds.length === 0) {
      throw new BadRequestException(
        'At least one passenger (excluding yourself) is required',
      );
    }

    const favorite = await this.prisma.rideFavorite.create({
      data: {
        id: randomUUID(),
        userId,
        name: createFavoriteDto.name,
        passengerIds: uniquePassengerIds,
        chargePerMile: createFavoriteDto.chargePerMile,
        chargePerRide: createFavoriteDto.chargePerRide,
        origin: createFavoriteDto.origin,
        destination: createFavoriteDto.destination,
        groupId: createFavoriteDto.groupId,
      },
    });

    // Enrich with passenger details
    const passengers = await Promise.all(
      favorite.passengerIds.map(async (passengerId) => {
        const user = await this.prisma.user.findUnique({
          where: { id: passengerId },
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
        });
        return user
          ? {
              id: user.id,
              email: user.email,
              displayName: user.UserProfile?.displayName || user.email,
              avatarUrl: user.UserProfile?.avatarUrl || null,
            }
          : null;
      }),
    );

    return {
      id: favorite.id,
      name: favorite.name,
      passengerIds: favorite.passengerIds,
      passengers: passengers.filter((p) => p !== null),
      chargePerMile: favorite.chargePerMile,
      chargePerRide: favorite.chargePerRide,
      origin: favorite.origin,
      destination: favorite.destination,
      groupId: favorite.groupId,
      createdAt: favorite.createdAt.toISOString(),
      updatedAt: favorite.updatedAt.toISOString(),
    };
  }

  /**
   * Update a favorite ride
   */
  async updateFavoriteRide(
    userId: string,
    favoriteId: string,
    updateDto: UpdateRideFavoriteDto,
  ) {
    const favorite = await this.prisma.rideFavorite.findUnique({
      where: { id: favoriteId },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite ride not found');
    }

    if (favorite.userId !== userId) {
      throw new BadRequestException(
        'You can only update your own favorite rides',
      );
    }

    // If passengerIds is being updated, filter out driver
    const passengerIds = updateDto.passengerIds
      ? updateDto.passengerIds.filter((pid) => pid !== userId)
      : favorite.passengerIds;

    if (updateDto.passengerIds && passengerIds.length === 0) {
      throw new BadRequestException(
        'At least one passenger (excluding yourself) is required',
      );
    }

    // Validate that at least one pricing method exists after update
    const chargePerMile =
      updateDto.chargePerMile !== undefined
        ? updateDto.chargePerMile
        : favorite.chargePerMile;
    const chargePerRide =
      updateDto.chargePerRide !== undefined
        ? updateDto.chargePerRide
        : favorite.chargePerRide;

    if (!chargePerMile && !chargePerRide) {
      throw new BadRequestException(
        'Either chargePerMile or chargePerRide must be provided',
      );
    }

    const updated = await this.prisma.rideFavorite.update({
      where: { id: favoriteId },
      data: {
        name: updateDto.name !== undefined ? updateDto.name : favorite.name,
        passengerIds: passengerIds,
        chargePerMile:
          updateDto.chargePerMile !== undefined
            ? updateDto.chargePerMile
            : favorite.chargePerMile,
        chargePerRide:
          updateDto.chargePerRide !== undefined
            ? updateDto.chargePerRide
            : favorite.chargePerRide,
        origin:
          updateDto.origin !== undefined ? updateDto.origin : favorite.origin,
        destination:
          updateDto.destination !== undefined
            ? updateDto.destination
            : favorite.destination,
        groupId:
          updateDto.groupId !== undefined
            ? updateDto.groupId
            : favorite.groupId,
      },
    });

    // Enrich with passenger details
    const passengers = await Promise.all(
      updated.passengerIds.map(async (passengerId) => {
        const user = await this.prisma.user.findUnique({
          where: { id: passengerId },
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
        });
        return user
          ? {
              id: user.id,
              email: user.email,
              displayName: user.UserProfile?.displayName || user.email,
              avatarUrl: user.UserProfile?.avatarUrl || null,
            }
          : null;
      }),
    );

    return {
      id: updated.id,
      name: updated.name,
      passengerIds: updated.passengerIds,
      passengers: passengers.filter((p) => p !== null),
      chargePerMile: updated.chargePerMile,
      chargePerRide: updated.chargePerRide,
      origin: updated.origin,
      destination: updated.destination,
      groupId: updated.groupId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Delete a favorite ride
   */
  async deleteFavoriteRide(userId: string, favoriteId: string) {
    const favorite = await this.prisma.rideFavorite.findUnique({
      where: { id: favoriteId },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite ride not found');
    }

    if (favorite.userId !== userId) {
      throw new BadRequestException(
        'You can only delete your own favorite rides',
      );
    }

    await this.prisma.rideFavorite.delete({
      where: { id: favoriteId },
    });

    return { success: true };
  }

  /**
   * Create a ride from a favorite template (quick creation with today's date)
   * This is the "one-tap" ride creation feature
   */
  async createRideFromFavorite(
    userId: string,
    favoriteId: string,
    distance?: number,
  ) {
    const favorite = await this.prisma.rideFavorite.findUnique({
      where: { id: favoriteId },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite ride not found');
    }

    if (favorite.userId !== userId) {
      throw new BadRequestException(
        'You can only create rides from your own favorites',
      );
    }

    // Build CreateRideDto from favorite
    const createRideDto: CreateRideDto = {
      type: 'giveRide', // Favorite rides are always "Charge Riders" type
      origin: favorite.origin || 'Origin',
      destination: favorite.destination || 'Destination',
      passengerIds: favorite.passengerIds,
      chargePerMile: favorite.chargePerMile || undefined,
      chargePerRide: favorite.chargePerRide || undefined,
      distance: distance || undefined, // Distance can be provided when creating ride, or calculated later
      groupId: favorite.groupId || undefined,
      date: new Date().toISOString(), // Use today's date for quick creation
    };

    // Use existing createRide method to create the ride with today's date
    return this.createRide(userId, createRideDto);
  }
}
