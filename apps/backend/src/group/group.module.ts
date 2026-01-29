import { Module } from '@nestjs/common';
import { GroupService } from './group.service';
import { GroupController } from './group.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedModule } from '../shared/shared.module';
import { NotificationModule } from '../notification/notification.module';
import { ListingModule } from '../listing/listing.module';
import { PostModule } from '../post/post.module';

@Module({
  imports: [PrismaModule, SharedModule, NotificationModule, ListingModule, PostModule],
  controllers: [GroupController],
  providers: [GroupService],
  exports: [GroupService],
})
export class GroupModule {}
