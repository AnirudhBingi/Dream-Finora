import { api } from "./client";

export interface AccountInfo {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface UpdateEmailDto {
  email: string;
  password: string;
}

export interface DeleteAccountDto {
  password: string;
}

export async function getAccountInfo(token: string): Promise<AccountInfo> {
  return api.get<AccountInfo>("/account", { token });
}

export async function changePassword(
  token: string,
  data: ChangePasswordDto,
): Promise<{ message: string }> {
  return api.put<{ message: string }>("/account/password", data, { token });
}

export async function forgotPassword(
  data: ForgotPasswordDto,
): Promise<{ message: string }> {
  return api.post<{ message: string }>("/account/forgot-password", data, {
    requiresAuth: false,
  });
}

export async function resetPassword(
  data: ResetPasswordDto,
): Promise<{ message: string }> {
  return api.post<{ message: string }>("/account/reset-password", data, {
    requiresAuth: false,
  });
}

export async function updateEmail(
  token: string,
  data: UpdateEmailDto,
): Promise<{ message: string; email: string }> {
  return api.put<{ message: string; email: string }>("/account/email", data, {
    token,
  });
}

export async function deleteAccount(
  token: string,
  data: DeleteAccountDto,
): Promise<{ message: string }> {
  // DELETE with body requires using apiClient directly
  const { apiClient } = await import("./client");
  return apiClient<{ message: string }>("/account", {
    method: "DELETE",
    token,
    body: data,
  });
}
