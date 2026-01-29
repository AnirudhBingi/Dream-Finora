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

export class UpdateChoreDto {
  @IsOptional()
  @IsString()
  title?: string;

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
    daysOfWeek?: number[];
    interval?: number;
    dayOfMonth?: number;
    weekOfMonth?: number;
    dayOfWeek?: number;
  };

  @IsOptional()
  @IsDateString()
  recurrenceEndDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  recurrenceCount?: number;

  // Rotation fields
  @IsOptional()
  @IsBoolean()
  rotationEnabled?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['round-robin'])
  rotationType?: 'round-robin';
}
