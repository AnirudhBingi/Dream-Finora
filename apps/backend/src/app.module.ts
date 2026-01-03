import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { TrustScoreModule } from './trust-score/trust-score.module';
import { ExpenseModule } from './expense/expense.module';
import { GroupModule } from './group/group.module';
import { FinanceModule } from './finance/finance.module';
import { ChoreModule } from './chore/chore.module';
import { RideModule } from './ride/ride.module';
import { ListingModule } from './listing/listing.module';
import { MessagingModule } from './messaging/messaging.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ActivityModule } from './activity/activity.module';
import { FriendModule } from './friend/friend.module';
import { SharedModule } from './shared/shared.module';
import { NotificationModule } from './notification/notification.module';
import { AccountModule } from './account/account.module';
import { ExportModule } from './export/export.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    SharedModule,
    AuthModule,
    AccountModule,
    ProfileModule,
    TrustScoreModule,
    ExpenseModule,
    GroupModule,
    FinanceModule,
    ChoreModule,
    RideModule,
    ListingModule,
    MessagingModule,
    AnalyticsModule,
    ActivityModule,
    FriendModule,
    NotificationModule,
    ExportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
