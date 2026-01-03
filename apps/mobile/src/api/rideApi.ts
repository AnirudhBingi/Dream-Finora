import { getApiBaseUrl } from './getApiBaseUrl';

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
  type: 'giveRide' | 'rideshare';
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
  type: 'giveRide' | 'rideshare';
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
  type?: 'giveRide' | 'rideshare';
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
  const response = await fetch(`${getApiBaseUrl()}/rides`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create ride' }));
    throw new Error(error.message || `Failed to create ride: ${response.status}`);
  }

  return response.json();
}

export async function getRides(
  token: string,
  groupId?: string,
): Promise<Ride[]> {
  const url = groupId
    ? `${getApiBaseUrl()}/rides?groupId=${groupId}`
    : `${getApiBaseUrl()}/rides`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch rides' }));
    throw new Error(error.message || `Failed to fetch rides: ${response.status}`);
  }

  return response.json();
}

export async function getRideById(token: string, rideId: string): Promise<Ride> {
  const response = await fetch(`${getApiBaseUrl()}/rides/${rideId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch ride' }));
    throw new Error(error.message || `Failed to fetch ride: ${response.status}`);
  }

  return response.json();
}

export async function joinRide(token: string, rideId: string): Promise<Ride> {
  const response = await fetch(`${getApiBaseUrl()}/rides/${rideId}/join`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to join ride' }));
    throw new Error(error.message || `Failed to join ride: ${response.status}`);
  }

  return response.json();
}

export interface UpdateRideDto {
  type?: 'giveRide' | 'rideshare';
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

export async function updateRide(
  token: string,
  rideId: string,
  data: UpdateRideDto,
): Promise<Ride> {
  const response = await fetch(`${getApiBaseUrl()}/rides/${rideId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update ride' }));
    throw new Error(error.message || `Failed to update ride: ${response.status}`);
  }

  return response.json();
}

export async function deleteRide(token: string, rideId: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/rides/${rideId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete ride' }));
    throw new Error(error.message || `Failed to delete ride: ${response.status}`);
  }
}

export async function getRideHistory(
  token: string,
  rideId: string,
): Promise<RideHistoryEntry[]> {
  const response = await fetch(`${getApiBaseUrl()}/rides/${rideId}/history`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch ride history' }));
    throw new Error(error.message || `Failed to fetch ride history: ${response.status}`);
  }

  return response.json();
}

