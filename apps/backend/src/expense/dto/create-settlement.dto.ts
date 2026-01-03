import { IsString, IsNumber, IsOptional, IsNotEmpty, Min } from 'class-validator';

export class CreateSettlementDto {
  @IsString()
  @IsNotEmpty()
  payeeId: string; // User who receives the payment (the one who is owed)

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string; // Default to USD

  @IsString()
  @IsNotEmpty()
  paymentMethod: string; // Cash, Venmo, PayPal, Bank Transfer, Other

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString({ each: true })
  @IsOptional()
  splitIds?: string[]; // Optional: specific expense splits to settle (if not provided, settles all outstanding)
}

