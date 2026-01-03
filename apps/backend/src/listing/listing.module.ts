import { Module, forwardRef } from '@nestjs/common';
import { ListingController } from './listing.controller';
import { ListingService } from './listing.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CategorizationService } from '../shared/categorization.service';
import { TrustScoreModule } from '../trust-score/trust-score.module';

@Module({
  imports: [PrismaModule, forwardRef(() => TrustScoreModule)],
  controllers: [ListingController],
  providers: [ListingService, CategorizationService],
  exports: [ListingService],
})
export class ListingModule {}

