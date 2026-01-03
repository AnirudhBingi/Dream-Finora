import { Module, forwardRef } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { BudgetService } from './budget.service';
import { BudgetController } from './budget.controller';
import { GoalService } from './goal.service';
import { GoalController } from './goal.controller';
import { LoanService } from './loan.service';
import { LoanController } from './loan.controller';
import { FinancialAdvisorService } from './financial-advisor.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedModule } from '../shared/shared.module';
import { ExpenseModule } from '../expense/expense.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [PrismaModule, SharedModule, forwardRef(() => ExpenseModule), AnalyticsModule],
  controllers: [FinanceController, BudgetController, GoalController, LoanController],
  providers: [BudgetService, GoalService, LoanService, FinanceService, FinancialAdvisorService],
  exports: [FinanceService, BudgetService, GoalService, LoanService, FinancialAdvisorService],
})
export class FinanceModule {}

