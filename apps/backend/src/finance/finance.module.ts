import { Module, forwardRef } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { BudgetService } from './budget.service';
import { BudgetController } from './budget.controller';
import { GoalService } from './goal.service';
import { GoalController } from './goal.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CategorizationService } from '../shared/categorization.service';
import { ExpenseModule } from '../expense/expense.module';

@Module({
  imports: [PrismaModule, forwardRef(() => ExpenseModule)],
  controllers: [FinanceController, BudgetController, GoalController],
  providers: [BudgetService, GoalService, FinanceService, CategorizationService],
  exports: [FinanceService, BudgetService, GoalService],
})
export class FinanceModule {}

