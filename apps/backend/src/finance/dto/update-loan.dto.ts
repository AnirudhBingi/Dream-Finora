import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, Min, IsInt } from 'class-validator';

export class UpdateLoanDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  lender?: string;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  principalAmount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  remainingAmount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  interestRate?: number;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  emi?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  loanTerm?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  remainingMonths?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  nextPaymentDate?: string;

  @IsEnum(['monthly', 'quarterly', 'yearly'])
  @IsOptional()
  paymentFrequency?: 'monthly' | 'quarterly' | 'yearly';

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsEnum(['active', 'completed', 'paused'])
  @IsOptional()
  status?: 'active' | 'completed' | 'paused';
}

