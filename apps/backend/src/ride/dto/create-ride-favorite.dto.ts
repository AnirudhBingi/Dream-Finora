import {
  IsString,
  IsArray,
  IsNumber,
  IsOptional,
  Min,
  ArrayMinSize,
  ValidateIf,
} from 'class-validator';

export class CreateRideFavoriteDto {
  @IsString()
  name: string; // e.g., "School run with John"

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one passenger is required' })
  @IsString({ each: true })
  passengerIds: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @ValidateIf((o: CreateRideFavoriteDto) => !o.chargePerRide) // At least one pricing method is required
  chargePerMile?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @ValidateIf((o: CreateRideFavoriteDto) => !o.chargePerMile) // At least one pricing method is required
  chargePerRide?: number;

  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsString()
  groupId?: string;
}

export class UpdateRideFavoriteDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one passenger is required' })
  @IsString({ each: true })
  passengerIds?: string[];

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
  origin?: string;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsString()
  groupId?: string;
}
