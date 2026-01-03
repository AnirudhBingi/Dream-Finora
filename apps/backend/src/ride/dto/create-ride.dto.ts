import { IsString, IsOptional, IsNumber, IsArray, IsIn, Min } from 'class-validator';

export class CreateRideDto {
  @IsString()
  @IsIn(['giveRide', 'rideshare'])
  type: 'giveRide' | 'rideshare';

  @IsString()
  origin: string;

  @IsString()
  destination: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distance?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  chargePerMile?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  chargePerRide?: number;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  passengerIds?: string[];

  @IsOptional()
  @IsString()
  date?: string; // ISO date string
}

