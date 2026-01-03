import { IsString, IsEmail, IsOptional, Matches } from 'class-validator';

export class InviteMemberDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Invalid mobile number format',
  })
  mobileNumber?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

