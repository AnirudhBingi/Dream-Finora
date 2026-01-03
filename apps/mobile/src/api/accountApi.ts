import { getApiBaseUrl } from './getApiBaseUrl';

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
  const response = await fetch(`${getApiBaseUrl()}/account`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch account info' }));
    throw new Error(error.message || `Failed to fetch account info: ${response.status}`);
  }

  return response.json();
}

export async function changePassword(
  token: string,
  data: ChangePasswordDto,
): Promise<{ message: string }> {
  const response = await fetch(`${getApiBaseUrl()}/account/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to change password' }));
    throw new Error(error.message || `Failed to change password: ${response.status}`);
  }

  return response.json();
}

export async function forgotPassword(
  data: ForgotPasswordDto,
): Promise<{ message: string }> {
  const response = await fetch(`${getApiBaseUrl()}/account/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to send reset email' }));
    throw new Error(error.message || `Failed to send reset email: ${response.status}`);
  }

  return response.json();
}

export async function resetPassword(
  data: ResetPasswordDto,
): Promise<{ message: string }> {
  const response = await fetch(`${getApiBaseUrl()}/account/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to reset password' }));
    throw new Error(error.message || `Failed to reset password: ${response.status}`);
  }

  return response.json();
}

export async function updateEmail(
  token: string,
  data: UpdateEmailDto,
): Promise<{ message: string; email: string }> {
  const response = await fetch(`${getApiBaseUrl()}/account/email`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update email' }));
    throw new Error(error.message || `Failed to update email: ${response.status}`);
  }

  return response.json();
}

export async function deleteAccount(
  token: string,
  data: DeleteAccountDto,
): Promise<{ message: string }> {
  const response = await fetch(`${getApiBaseUrl()}/account`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete account' }));
    throw new Error(error.message || `Failed to delete account: ${response.status}`);
  }

  return response.json();
}

