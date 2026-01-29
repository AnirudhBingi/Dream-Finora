import { api } from "./client";

export interface RideParticipant {
  id: string;
  rideId: string;
  userId: string;
  isDriver: boolean;
  createdAt: string;
  user: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
}

export interface Ride {
  id: string;
  driverId: string;
  type: "giveRide" | "rideshare";
  origin: string;
  destination: string;
  distance: number | null;
  chargePerMile: number | null;
  chargePerRide: number | null;
  totalCost: number;
  currency: string;
  date: string;
  createdAt: string;
  expenseId: string | null;
  driver: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  };
  participants: RideParticipant[];
}

export interface CreateRideDto {
  type: "giveRide" | "rideshare";
  origin: string;
  destination: string;
  distance?: number;
  chargePerMile?: number;
  chargePerRide?: number;
  groupId?: string;
  passengerIds?: string[];
  date?: string;
}

export interface UpdateRideDto {
  type?: "giveRide" | "rideshare";
  origin?: string;
  destination?: string;
  distance?: number;
  chargePerMile?: number;
  chargePerRide?: number;
  passengerIds?: string[];
  date?: string;
}

export interface RideHistoryEntry {
  type: string;
  timestamp: string;
  description: string;
  user: {
    id: string;
    email: string;
    profile?: {
      displayName: string | null;
      avatarUrl: string | null;
    } | null;
  } | null;
}

export async function createRide(
  token: string,
  data: CreateRideDto,
): Promise<Ride> {
  return api.post<Ride>("/rides", data, { token });
}

export async function getRides(
  token: string,
  groupId?: string,
): Promise<Ride[]> {
  const endpoint = groupId ? `/rides?groupId=${groupId}` : "/rides";
  return api.get<Ride[]>(endpoint, { token });
}

export async function getRideById(
  token: string,
  rideId: string,
): Promise<Ride> {
  return api.get<Ride>(`/rides/${rideId}`, { token });
}

export async function joinRide(token: string, rideId: string): Promise<Ride> {
  return api.put<Ride>(`/rides/${rideId}/join`, undefined, { token });
}

export async function updateRide(
  token: string,
  rideId: string,
  data: UpdateRideDto,
): Promise<Ride> {
  return api.patch<Ride>(`/rides/${rideId}`, data, { token });
}

export async function deleteRide(token: string, rideId: string): Promise<void> {
  await api.delete<void>(`/rides/${rideId}`, { token });
}

export async function getRideHistory(
  token: string,
  rideId: string,
): Promise<RideHistoryEntry[]> {
  return api.get<RideHistoryEntry[]>(`/rides/${rideId}/history`, { token });
}

// Favorite Rides
export interface RideFavorite {
  id: string;
  name: string;
  passengerIds: string[];
  passengers: Array<{
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  }>;
  chargePerMile: number | null;
  chargePerRide: number | null;
  origin: string | null;
  destination: string | null;
  groupId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRideFavoriteDto {
  name: string;
  passengerIds: string[];
  chargePerMile?: number;
  chargePerRide?: number;
  origin?: string;
  destination?: string;
  groupId?: string;
}

export interface UpdateRideFavoriteDto {
  name?: string;
  passengerIds?: string[];
  chargePerMile?: number;
  chargePerRide?: number;
  origin?: string;
  destination?: string;
  groupId?: string;
}

export async function getFavoriteRides(token: string): Promise<RideFavorite[]> {
  return api.get<RideFavorite[]>("/rides/favorites", { token });
}

export async function createFavoriteRide(
  token: string,
  data: CreateRideFavoriteDto,
): Promise<RideFavorite> {
  return api.post<RideFavorite>("/rides/favorites", data, { token });
}

export async function createRideFromFavorite(
  token: string,
  favoriteId: string,
  distance?: number,
): Promise<Ride> {
  return api.post<Ride>(
    `/rides/favorites/${favoriteId}/record`,
    distance ? { distance } : {},
    { token },
  );
}

export async function updateFavoriteRide(
  token: string,
  favoriteId: string,
  data: UpdateRideFavoriteDto,
): Promise<RideFavorite> {
  return api.patch<RideFavorite>(`/rides/favorites/${favoriteId}`, data, {
    token,
  });
}

export async function deleteFavoriteRide(
  token: string,
  favoriteId: string,
): Promise<void> {
  await api.delete<void>(`/rides/favorites/${favoriteId}`, { token });
}
