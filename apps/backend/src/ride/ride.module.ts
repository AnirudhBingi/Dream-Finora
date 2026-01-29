import { Module, forwardRef } from '@nestjs/common';
import { RideService } from './ride.service';
import { RideController } from './ride.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [PrismaModule, NotificationModule, forwardRef(() => FinanceModule)],
  controllers: [RideController],
  providers: [RideService],
  exports: [RideService],
})
export class RideModule {}
