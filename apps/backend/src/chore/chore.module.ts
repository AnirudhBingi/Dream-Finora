import { Module } from '@nestjs/common';
import { ChoreService } from './chore.service';
import { ChoreController } from './chore.controller';
import { ChoreStatsService } from './chore-stats.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TrustScoreModule } from '../trust-score/trust-score.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, TrustScoreModule, NotificationModule],
  controllers: [ChoreController],
  providers: [ChoreService, ChoreStatsService],
  exports: [ChoreService, ChoreStatsService],
})
export class ChoreModule {}

