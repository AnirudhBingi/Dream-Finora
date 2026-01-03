import { IsNumber, IsDateString, IsOptional, IsString, Min } from 'class-validator';

export class AddPaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsNumber()
  @Min(0)
  principalPaid: number; // Principal portion of payment

  @IsNumber()
  @Min(0)
  interestPaid: number; // Interest portion of payment

  @IsDateString()
  paymentDate: string;

  @IsString()
  @IsOptional()
  transactionId?: string; // Optional: link to finance transaction

  @IsString()
  @IsOptional()
  notes?: string;
}

