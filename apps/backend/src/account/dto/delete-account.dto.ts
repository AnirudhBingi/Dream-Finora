import { IsNotEmpty } from 'class-validator';

export class DeleteAccountDto {
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
