import { IsString, IsNotEmpty } from 'class-validator';

export class SendFriendRequestDto {
  @IsString()
  @IsNotEmpty()
  // Accept either email or mobile number
  friendEmailOrMobile: string;
}
