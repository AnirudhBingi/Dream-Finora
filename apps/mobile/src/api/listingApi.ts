import { api } from "./client";
import { UserSummary } from "./types";

export enum ListingType {
  ROOMMATE = "roommate",
  ACCOMMODATION = "accommodation",
  ITEM = "item",
  EVENT = "event",
  RIDE = "ride",
}

export enum ListingStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  CLOSED = "closed",
}

export interface Listing {
  id: string;
  userId: string;
  groupId?: string | null;
  type: ListingType;
  title: string;
  description: string;
  location?: string | null;
  price?: number | null;
  currency?: string | null;
  status: ListingStatus;
  images: string[];
  views: number;
  metadata?:
    | RoommateMetadata
    | AccommodationMetadata
    | ItemMetadata
    | EventMetadata
    | RideMetadata
    | null;
  createdAt: string;
  updatedAt: string;
  isFavorited?: boolean;
  favoriteCount?: number;
  commentCount?: number;
  latestComment?: ListingCommentPreview | null;
  latestComments?: ListingCommentPreview[];
  user: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
}

export interface ListingCommentPreview {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  } | null;
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
  groupId?: string;
  metadata?:
    | RoommateMetadata
    | AccommodationMetadata
    | ItemMetadata
    | EventMetadata
    | RideMetadata;
}

export interface ListingComment {
  id: string;
  listingId: string;
  userId: string;
  content: string;
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

export async function createListing(
  token: string,
  data: CreateListingDto,
): Promise<Listing> {
  return api.post<Listing>("/listings", data, { token });
}

export interface PaginatedListingsResponse {
  listings: Listing[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export async function getListings(
  token: string,
  filters?: {
    userId?: string;
    type?: ListingType;
    status?: ListingStatus;
    search?: string;
    location?: string;
    groupId?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: "newest" | "price_low" | "price_high" | "popular";
    limit?: number;
    offset?: number;
    cursor?: string;
  },
): Promise<PaginatedListingsResponse | Listing[]> {
  const params = new URLSearchParams();
  if (filters?.userId) params.append("userId", filters.userId);
  if (filters?.type) params.append("type", filters.type);
  if (filters?.status) params.append("status", filters.status);
  if (filters?.search) params.append("search", filters.search);
  if (filters?.location) params.append("location", filters.location);
  if (filters?.groupId) params.append("groupId", filters.groupId);
  if (filters?.minPrice !== undefined)
    params.append("minPrice", filters.minPrice.toString());
  if (filters?.maxPrice !== undefined)
    params.append("maxPrice", filters.maxPrice.toString());
  if (filters?.sort) params.append("sort", filters.sort);
  if (filters?.limit !== undefined)
    params.append("limit", filters.limit.toString());
  if (filters?.offset !== undefined)
    params.append("offset", filters.offset.toString());
  if (filters?.cursor) params.append("cursor", filters.cursor);

  const endpoint = params.toString()
    ? `/listings?${params.toString()}`
    : "/listings";
  const data = await api.get<PaginatedListingsResponse | Listing[]>(endpoint, {
    token,
  });

  // Check if response has pagination structure
  if (
    data &&
    typeof data === "object" &&
    "listings" in data &&
    Array.isArray((data as any).listings)
  ) {
    return data as PaginatedListingsResponse;
  }
  // Backward compatibility: return array if not paginated
  return data as Listing[];
}

export async function getMyListings(token: string): Promise<Listing[]> {
  return api.get<Listing[]>("/listings/my", { token });
}

export async function getListingById(
  token: string,
  listingId: string,
): Promise<Listing> {
  return api.get<Listing>(`/listings/${listingId}`, { token });
}

export async function updateListingStatus(
  token: string,
  listingId: string,
  status: ListingStatus,
): Promise<Listing> {
  return api.put<Listing>(
    `/listings/${listingId}/status`,
    { status },
    { token },
  );
}

export async function deleteListing(
  token: string,
  listingId: string,
): Promise<void> {
  return api.delete<void>(`/listings/${listingId}`, { token });
}

export async function getItemCategories(token: string): Promise<string[]> {
  const data = await api.get<{ categories: string[] }>("/listings/categories", {
    token,
  });
  return data.categories || [];
}

export async function suggestCategory(
  token: string,
  title: string,
): Promise<{ category: string | null }> {
  try {
    return await api.get<{ category: string | null }>(
      `/listings/suggest-category?title=${encodeURIComponent(title)}`,
      { token },
    );
  } catch {
    return { category: null };
  }
}

export async function uploadListingImages(
  token: string,
  listingId: string,
  imageUris: string[],
): Promise<Listing> {
  const formData = new FormData();

  for (const uri of imageUris) {
    const filename = uri.split("/").pop() || "image.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    formData.append("files", {
      uri,
      name: filename,
      type,
    } as any);
  }

  return api.post<Listing>(`/listings/${listingId}/images`, formData, {
    token,
  });
}

export async function updateListing(
  token: string,
  listingId: string,
  data: Partial<CreateListingDto>,
): Promise<Listing> {
  return api.put<Listing>(`/listings/${listingId}`, data, { token });
}

export async function toggleFavorite(
  token: string,
  listingId: string,
): Promise<{ favorited: boolean }> {
  return api.post<{ favorited: boolean }>(
    `/listings/${listingId}/favorite`,
    undefined,
    { token },
  );
}

export async function getFavorites(token: string): Promise<Listing[]> {
  return api.get<Listing[]>("/listings/favorites", { token });
}

export async function getListingFavorites(
  token: string,
  listingId: string,
): Promise<UserSummary[]> {
  return api.get<UserSummary[]>(`/listings/${listingId}/favorites`, { token });
}

export async function getComments(
  token: string,
  listingId: string,
): Promise<ListingComment[]> {
  return api.get<ListingComment[]>(`/listings/${listingId}/comments`, {
    token,
  });
}

export async function addComment(
  token: string,
  listingId: string,
  content: string,
): Promise<ListingComment> {
  return api.post<ListingComment>(
    `/listings/${listingId}/comments`,
    { content },
    { token },
  );
}

export async function editComment(
  token: string,
  listingId: string,
  commentId: string,
  content: string,
): Promise<ListingComment> {
  return api.put<ListingComment>(
    `/listings/${listingId}/comments/${commentId}`,
    { content },
    { token },
  );
}

export async function deleteComment(
  token: string,
  listingId: string,
  commentId: string,
): Promise<void> {
  return api.delete<void>(`/listings/${listingId}/comments/${commentId}`, {
    token,
  });
}

export async function generateShareLink(
  token: string,
  listingId: string,
): Promise<{ shareLink: string; listingId: string }> {
  return api.post<{ shareLink: string; listingId: string }>(
    `/listings/${listingId}/share`,
    undefined,
    { token },
  );
}
