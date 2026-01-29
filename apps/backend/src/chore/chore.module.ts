import { Module } from '@nestjs/common';
import { ChoreService } from './chore.service';
import { ChoreController } from './chore.controller';
import { ChoreStatsService } from './chore-stats.service';
import { ChoreReminderService } from './chore-reminder.service';
import { ChorePointsService } from './chore-points.service';
import { RecurringChoreService } from './recurring-chore.service';
import { RecurringChoreScheduler } from './recurring-chore.scheduler';
import { ChoreRotationService } from './chore-rotation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TrustScoreModule } from '../trust-score/trust-score.module';
import { NotificationModule } from '../notification/notification.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [PrismaModule, TrustScoreModule, NotificationModule, ScheduleModule],
  controllers: [ChoreController],
  providers: [
    ChoreService,
    ChoreStatsService,
    ChoreReminderService,
    ChorePointsService,
    RecurringChoreService,
    RecurringChoreScheduler,
    ChoreRotationService,
  ],
  exports: [
    ChoreService,
    ChoreStatsService,
    ChoreReminderService,
    ChorePointsService,
    RecurringChoreService,
    ChoreRotationService,
  ],
})
export class ChoreModule {}
