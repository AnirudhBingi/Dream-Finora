import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateGoalDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0.01)
  targetAmount: number;

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

  @IsEnum(['local', 'home'])
  @IsOptional()
  context?: 'local' | 'home';
}
