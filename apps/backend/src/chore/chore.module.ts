import { Module } from '@nestjs/common';
import { ChoreService } from './chore.service';
import { ChoreController } from './chore.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TrustScoreModule } from '../trust-score/trust-score.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, TrustScoreModule, NotificationModule],
  controllers: [ChoreController],
  providers: [ChoreService],
  exports: [ChoreService],
})
export class ChoreModule {}

