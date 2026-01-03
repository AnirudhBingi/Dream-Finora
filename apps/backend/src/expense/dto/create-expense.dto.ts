import { IsString, IsNumber, IsArray, IsOptional, Min, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum SplitType {
  EQUAL = 'EQUAL',
  CUSTOM = 'CUSTOM',
  PERCENTAGE = 'PERCENTAGE',
}

export class ExpenseSplitDto {
  @IsString()
  userId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  percentage?: number; // For percentage splits (0-100)
}

export class CreateExpenseDto {
  @IsString()
  description: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseSplitDto)
  splits: ExpenseSplitDto[];

  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  paidBy?: string; // User ID who paid

  @IsOptional()
  @IsEnum(SplitType)
  splitType?: SplitType;
}

