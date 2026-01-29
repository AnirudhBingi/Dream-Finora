import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsIn,
  Min,
} from 'class-validator';

export class UpdateRideDto {
  @IsOptional()
  @IsString()
  @IsIn(['giveRide', 'rideshare'])
  type?: 'giveRide' | 'rideshare';

  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @IsString()
  destination?: string;

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
  @IsArray()
  @IsString({ each: true })
  passengerIds?: string[];

  @IsOptional()
  @IsString()
  date?: string; // ISO date string
}
