import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  @IsIn(['local', 'home'])
  context?: 'local' | 'home';

  @IsOptional()
  @IsString()
  accountType?: string;
}
