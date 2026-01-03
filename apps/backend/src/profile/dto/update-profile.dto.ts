import { IsString, IsOptional, MaxLength, Length } from 'class-validator';

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
}


