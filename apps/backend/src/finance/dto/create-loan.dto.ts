import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, Min, IsInt } from 'class-validator';

export class CreateLoanDto {
  @IsString()
  name: string;

  @IsString()
  lender: string;

  @IsNumber()
  @Min(0.01)
  principalAmount: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  remainingAmount?: number;

  @IsNumber()
  @Min(0)
  interestRate: number; // Annual interest rate (e.g., 5.5 for 5.5%)

  @IsNumber()
  @Min(0.01)
  emi: number; // Monthly EMI amount

  @IsInt()
  @Min(1)
  loanTerm: number; // Total months

  @IsInt()
  @Min(0)
  @IsOptional()
  remainingMonths?: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  nextPaymentDate: string;

  @IsEnum(['monthly', 'quarterly', 'yearly'])
  @IsOptional()
  paymentFrequency?: 'monthly' | 'quarterly' | 'yearly';

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsEnum(['local', 'home'])
  @IsOptional()
  context?: 'local' | 'home';
}

