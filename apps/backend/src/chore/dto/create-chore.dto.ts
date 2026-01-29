import {
  IsString,
  IsOptional,
  IsInt,
  IsDateString,
  Min,
  IsArray,
  IsIn,
  IsBoolean,
  IsObject,
} from 'class-validator';

export class CreateChoreDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  friendId?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedToMultiple?: string[];

  @IsOptional()
  @IsString()
  @IsIn(['single', 'multiple', 'open'])
  assignmentType?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  reminderHoursBefore?: number; // e.g., 24 for 24 hours before due date

  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean;

  // Recurring chore fields
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['daily', 'weekly', 'monthly', 'custom'])
  recurrencePattern?: 'daily' | 'weekly' | 'monthly' | 'custom';

  @IsOptional()
  @IsObject()
  recurrenceConfig?: {
    daysOfWeek?: number[]; // 0-6 (Sunday-Saturday) for weekly
    interval?: number; // e.g., every 2 days, every 3 weeks
    dayOfMonth?: number; // For monthly (1-31)
    weekOfMonth?: number; // For monthly (1-5, -1 for last)
    dayOfWeek?: number; // For monthly (0-6)
  };

  @IsOptional()
  @IsDateString()
  recurrenceEndDate?: string; // When to stop generating occurrences

  @IsOptional()
  @IsInt()
  @Min(1)
  recurrenceCount?: number; // How many occurrences to generate (null = infinite)

  // Rotation fields
  @IsOptional()
  @IsBoolean()
  rotationEnabled?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['round-robin'])
  rotationType?: 'round-robin';
}
