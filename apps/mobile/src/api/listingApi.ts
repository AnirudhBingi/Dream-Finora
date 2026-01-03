import { getApiBaseUrl } from './getApiBaseUrl';

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

export interface Listing {
  id: string;
  userId: string;
  type: ListingType;
  title: string;
  description: string;
  location?: string | null;
  price?: number | null;
  currency?: string | null;
  status: ListingStatus;
  images: string[];
  views: number;
  metadata?: RoommateMetadata | AccommodationMetadata | ItemMetadata | EventMetadata | RideMetadata | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
}

// Type-specific metadata interfaces
export interface RoommateMetadata {
  lookingFor?: boolean;
  budget?: number;
  moveInDate?: string;
  duration?: string;
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
  leaseDuration?: string;
  utilitiesIncluded?: boolean;
  furnished?: boolean;
}

export interface ItemMetadata {
  condition?: string;
  category?: string;
  brand?: string;
}

export interface EventMetadata {
  eventDate?: string;
  eventTime?: string;
  maxAttendees?: number;
  eventType?: string;
  isPublic?: boolean;
}

export interface RideMetadata {
  origin?: string;
  destination?: string;
  rideDate?: string;
  rideTime?: string;
  availableSeats?: number;
  vehicleType?: string;
  pricePerPerson?: number;
}

export interface CreateListingDto {
  type: ListingType;
  title: string;
  description: string;
  location?: string;
  price?: number;
  currency?: string;
  images?: string[];
  metadata?: RoommateMetadata | AccommodationMetadata | ItemMetadata | EventMetadata | RideMetadata;
}

export async function createListing(
  token: string,
  data: CreateListingDto,
): Promise<Listing> {
  const response = await fetch(`${getApiBaseUrl()}/listings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create listing' }));
    throw new Error(error.message || `Failed to create listing: ${response.status}`);
  }

  return response.json();
}

export async function getListings(
  token: string,
  filters?: {
    type?: ListingType;
    status?: ListingStatus;
    search?: string;
  },
): Promise<Listing[]> {
  const params = new URLSearchParams();
  if (filters?.type) params.append('type', filters.type);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.search) params.append('search', filters.search);

  const url = `${getApiBaseUrl()}/listings${params.toString() ? `?${params.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch listings' }));
    throw new Error(error.message || `Failed to fetch listings: ${response.status}`);
  }

  return response.json();
}

export async function getMyListings(token: string): Promise<Listing[]> {
  const response = await fetch(`${getApiBaseUrl()}/listings/my`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch my listings' }));
    throw new Error(error.message || `Failed to fetch my listings: ${response.status}`);
  }

  return response.json();
}

export async function getListingById(token: string, listingId: string): Promise<Listing> {
  const response = await fetch(`${getApiBaseUrl()}/listings/${listingId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch listing' }));
    throw new Error(error.message || `Failed to fetch listing: ${response.status}`);
  }

  return response.json();
}

export async function updateListingStatus(
  token: string,
  listingId: string,
  status: ListingStatus,
): Promise<Listing> {
  const response = await fetch(`${getApiBaseUrl()}/listings/${listingId}/status`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update listing status' }));
    throw new Error(error.message || `Failed to update listing status: ${response.status}`);
  }

  return response.json();
}

export async function deleteListing(token: string, listingId: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/listings/${listingId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete listing' }));
    throw new Error(error.message || `Failed to delete listing: ${response.status}`);
  }
}

export async function getItemCategories(token: string): Promise<string[]> {
  const response = await fetch(`${getApiBaseUrl()}/listings/categories`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch categories' }));
    throw new Error(error.message || `Failed to fetch categories: ${response.status}`);
  }

  const data = await response.json();
  return data.categories || [];
}

export async function suggestCategory(
  token: string,
  title: string,
): Promise<{ category: string | null }> {
  const params = new URLSearchParams({ title });
  const response = await fetch(`${getApiBaseUrl()}/listings/suggest-category?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return { category: null };
  }

  return response.json();
}

export async function uploadListingImages(
  token: string,
  listingId: string,
  imageUris: string[],
): Promise<Listing> {
  const formData = new FormData();

  for (const uri of imageUris) {
    const filename = uri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    formData.append('files', {
      uri,
      name: filename,
      type,
    } as any);
  }

  const response = await fetch(`${getApiBaseUrl()}/listings/${listingId}/images`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to upload images' }));
    throw new Error(error.message || `Failed to upload images: ${response.status}`);
  }

  return response.json();
}

