import { getApiBaseUrl } from './getApiBaseUrl';

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
  const apiUrl = `${getApiBaseUrl()}/auth/register`;
  console.log('[API] Register URL:', apiUrl);
  console.log('[API] Register data:', { email: data.email, password: '***' });
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = `Registration failed (${response.status})`;
      try {
        const errorData = await response.json();
        // NestJS validation errors come in error.message array format
        if (errorData.message) {
          if (Array.isArray(errorData.message)) {
            errorMessage = errorData.message.join(', ');
          } else {
            errorMessage = errorData.message;
          }
        }
      } catch (e) {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    // Network errors or other fetch errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Cannot connect to server. Make sure backend is running and you are on the same Wi-Fi network.');
    }
    throw error;
  }
}

export async function login(data: LoginDto): Promise<AuthResponse> {
  const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(error.message || `Login failed: ${response.status}`);
  }

  return response.json();
}

