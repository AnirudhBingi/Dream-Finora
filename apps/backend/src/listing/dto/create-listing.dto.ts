import { IsString, IsNumber, IsOptional, IsArray, IsEnum, Min, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum ListingType {
  ROOMMATE = 'roommate',
  ACCOMMODATION = 'accommodation',
  ITEM = 'item',
  EVENT = 'event',
  RIDE = 'ride',
}

export enum ListingStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CLOSED = 'closed',
}

// Type-specific metadata interfaces
export interface RoommateMetadata {
  lookingFor?: boolean; // true = looking for, false = offering
  budget?: number;
  moveInDate?: string;
  duration?: string; // "short-term" | "long-term"
  preferences?: {
    smoking?: boolean;
    pets?: boolean;
    gender?: string;
    ageRange?: string;
  };
}

export interface AccommodationMetadata {
  bedrooms?: number;
  bathrooms?: number;
  availableFrom?: string;
  leaseDuration?: string; // "month-to-month" | "6 months" | "1 year" | etc.
  utilitiesIncluded?: boolean;
  furnished?: boolean;
}

export interface ItemMetadata {
  condition?: string; // "new" | "like-new" | "used" | "fair" | "poor"
  category?: string;
  brand?: string;
}

export interface EventMetadata {
  eventDate?: string;
  eventTime?: string;
  maxAttendees?: number;
  eventType?: string; // "party" | "meetup" | "workshop" | etc.
  isPublic?: boolean;
}

export interface RideMetadata {
  origin?: string;
  destination?: string;
  rideDate?: string;
  rideTime?: string;
  availableSeats?: number;
  vehicleType?: string; // "car" | "van" | "truck" | etc.
  pricePerPerson?: number;
}

export class CreateListingDto {
  @IsEnum(ListingType)
  type: ListingType;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsObject()
  metadata?: RoommateMetadata | AccommodationMetadata | ItemMetadata | EventMetadata | RideMetadata;
}

