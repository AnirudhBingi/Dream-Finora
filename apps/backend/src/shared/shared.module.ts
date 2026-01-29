import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CategorizationService } from './categorization.service';
import { CurrencyService } from './currency.service';
import { EmailService } from './email.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [CategorizationService, CurrencyService, EmailService],
  exports: [CategorizationService, CurrencyService, EmailService],
})
export class SharedModule {}
