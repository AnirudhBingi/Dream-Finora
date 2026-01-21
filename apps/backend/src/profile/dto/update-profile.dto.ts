import {
  IsString,
  IsOptional,
  MaxLength,
  Length,
  IsBoolean,
  IsIn,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  primaryCurrency?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  homeCountryCurrency?: string;

  // Notification preferences
  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  expenseReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  choreReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  messageNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  listingNotifications?: boolean;

  // Privacy settings
  @IsOptional()
  @IsString()
  @IsIn(['public', 'friends', 'private'])
  profileVisibility?: string;

  @IsOptional()
  @IsString()
  @IsIn(['public', 'friends', 'private'])
  trustScoreVisibility?: string;

  // Theme & Appearance settings
  @IsOptional()
  @IsString()
  @IsIn(['light', 'dark', 'system'])
  theme?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  @IsIn(['small', 'medium', 'large'])
  fontSize?: string;

  @IsOptional()
  @IsBoolean()
  highContrast?: boolean;
}
