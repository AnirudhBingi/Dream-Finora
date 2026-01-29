import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
  Max,
} from 'class-validator';

export class CreateBudgetDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(['weekly', 'monthly', 'yearly'])
  @IsOptional()
  period?: 'weekly' | 'monthly' | 'yearly';

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  warningThreshold?: number;

  @IsEnum(['local', 'home'])
  @IsOptional()
  context?: 'local' | 'home';
}
