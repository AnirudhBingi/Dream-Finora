import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, Min } from 'class-validator';

export class UpdateGoalDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  targetAmount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  currentAmount?: number;

  @IsDateString()
  @IsOptional()
  targetDate?: string;

  @IsEnum(['savings', 'debt', 'purchase', 'investment'])
  @IsOptional()
  category?: 'savings' | 'debt' | 'purchase' | 'investment';

  @IsEnum(['low', 'medium', 'high'])
  @IsOptional()
  priority?: 'low' | 'medium' | 'high';

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsEnum(['active', 'completed', 'paused', 'cancelled'])
  @IsOptional()
  status?: 'active' | 'completed' | 'paused' | 'cancelled';
}

