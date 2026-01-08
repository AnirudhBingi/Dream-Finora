import { IsString, IsNotEmpty, IsOptional, ValidateIf } from 'class-validator';

export class SendMessageDto {
  @IsOptional()
  @ValidateIf((o) => o.content !== undefined)
  @IsString()
  @IsNotEmpty()
  content?: string;
}

