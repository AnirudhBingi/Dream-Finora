import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CategorizationService } from './categorization.service';
import { CurrencyService } from './currency.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [CategorizationService, CurrencyService],
  exports: [CategorizationService, CurrencyService],
})
export class SharedModule {}

