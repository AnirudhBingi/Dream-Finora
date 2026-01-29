import { api, ApiClientError } from "./client";

export interface RegisterDto {
  email: string;
  mobileNumber?: string;
  password: string;
}

export interface LoginDto {
  identifier: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    mobileNumber?: string;
    createdAt: string;
  };
  token: string;
}

export async function register(data: RegisterDto): Promise<AuthResponse> {
  try {
    return await api.post<AuthResponse>("/auth/register", data, {
      requiresAuth: false,
    });
  } catch (error) {
    // Handle network errors with user-friendly message
    if (error instanceof ApiClientError) {
      throw error;
    }
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(
        "Cannot connect to server. Make sure backend is running and you are on the same Wi-Fi network.",
      );
    }
    throw error;
  }
}

export async function login(data: LoginDto): Promise<AuthResponse> {
  return api.post<AuthResponse>("/auth/login", data, {
    requiresAuth: false,
  });
}
