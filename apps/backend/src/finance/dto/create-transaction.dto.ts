import { IsString, IsNumber, IsOptional, Min, IsIn } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  @IsIn(['income', 'expense'])
  type: 'income' | 'expense';

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsIn(['local', 'home'])
  context: 'local' | 'home';

  // Income fields
  @IsOptional()
  @IsString()
  source?: string; // For income: "Salary", "Freelance", "Gift", etc.

  // Expense fields
  @IsOptional()
  @IsString()
  category?: string; // For expense: auto-populated from description

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  date?: Date | string; // Defaults to today if not provided (accepts Date or ISO string)
}
