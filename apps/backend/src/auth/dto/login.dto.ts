import { IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Email or mobile number is required' })
  // Accept either email format or mobile number format (starts with + or digits)
  identifier: string;

  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
