/**
 * Centralized API Client
 *
 * Provides a consistent interface for all API calls with:
 * - Automatic token injection
 * - Retry logic for transient failures
 * - Timeout handling
 * - Standardized error handling
 * - Consistent request/response patterns
 */

import { getApiBaseUrl } from "./getApiBaseUrl";

export interface ApiClientOptions {
  token?: string | null;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export type UnauthorizedHandler = () => void | Promise<void>;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  data?: any;
}

/**
 * Custom error class for API errors
 */
export class ApiClientError extends Error {
  status?: number;
  code?: string;
  data?: any;

  constructor(message: string, status?: number, code?: string, data?: any) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

/**
 * Default configuration
 */
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY = 1000; // 1 second

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any): boolean {
  // Network errors are retryable
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }

  // Timeout errors are retryable
  if (error instanceof Error && error.message.includes("timeout")) {
    return true;
  }

  // 5xx server errors are retryable (except 501, 505)
  if (
    error?.status &&
    error.status >= 500 &&
    error.status !== 501 &&
    error.status !== 505
  ) {
    return true;
  }

  // 429 (Too Many Requests) is retryable
  if (error?.status === 429) {
    return true;
  }

  return false;
}

/**
 * Extract error message from response
 */
async function extractErrorMessage(
  response: Response,
  defaultMessage: string,
): Promise<string> {
  try {
    const errorData = await response.json();

    // Handle NestJS validation errors (array format)
    if (errorData.message) {
      if (Array.isArray(errorData.message)) {
        return errorData.message.join(", ");
      }
      return errorData.message;
    }

    // Handle other error formats
    if (errorData.error) {
      return typeof errorData.error === "string"
        ? errorData.error
        : errorData.error.message || defaultMessage;
    }

    return defaultMessage;
  } catch {
    // If response is not JSON, use status text
    return response.statusText || defaultMessage;
  }
}

/**
 * Create fetch request with timeout
 */
function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number,
): Promise<Response> {
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Request timeout after ${timeout}ms`)),
        timeout,
      ),
    ),
  ]);
}

/**
 * Main API client function
 */
export async function apiClient<T>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: any;
    token?: string | null;
    timeout?: number;
    retries?: number;
    retryDelay?: number;
    headers?: Record<string, string>;
    requiresAuth?: boolean;
  } = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    token,
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    headers = {},
    requiresAuth = true,
  } = options;

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${getApiBaseUrl()}${endpoint}`;

  // Check if body is FormData
  const isFormData = body instanceof FormData;

  // Build headers
  const requestHeaders: Record<string, string> = {
    ...headers,
  };

  // Only set Content-Type if not FormData (FormData sets it automatically with boundary)
  if (!isFormData) {
    requestHeaders["Content-Type"] = "application/json";
  }

  // Add auth token if provided and auth is required
  if (requiresAuth && token) {
    requestHeaders["Authorization"] = `Bearer ${token}`;
  }

  // Build request options
  const requestOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };

  // Add body for non-GET requests
  if (body && method !== "GET") {
    if (isFormData) {
      requestOptions.body = body;
    } else {
      requestOptions.body =
        typeof body === "string" ? body : JSON.stringify(body);
    }
  }

  let lastError: any;

  // Retry logic
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Make request with timeout
      const response = await fetchWithTimeout(url, requestOptions, timeout);

      // Handle successful responses
      if (response.ok) {
        // Handle empty responses (204 No Content, etc.)
        if (
          response.status === 204 ||
          response.headers.get("content-length") === "0"
        ) {
          return undefined as T;
        }

        // Parse JSON response
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return await response.json();
        }

        // Return text response if not JSON
        return (await response.text()) as T;
      }

      // Handle error responses
      const errorMessage = await extractErrorMessage(
        response,
        `Request failed with status ${response.status}`,
      );

      const error = new ApiClientError(
        errorMessage,
        response.status,
        undefined,
        await response.json().catch(() => ({})),
      );

      if (response.status === 401 && requiresAuth && unauthorizedHandler) {
        await unauthorizedHandler();
      }

      // Don't retry 4xx errors (except 429)
      if (
        response.status >= 400 &&
        response.status < 500 &&
        response.status !== 429
      ) {
        throw error;
      }

      // Store error for retry
      lastError = error;

      // If this is the last attempt, throw the error
      if (attempt === retries) {
        throw error;
      }
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error;
      }

      // If this is the last attempt, throw the error
      if (attempt === retries) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      const delay = retryDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error("Unknown API error");
}

/**
 * Convenience methods for common HTTP methods
 */
export const api = {
  get: <T>(
    endpoint: string,
    options?: Omit<Parameters<typeof apiClient>[1], "method">,
  ) => apiClient<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(
    endpoint: string,
    body?: any,
    options?: Omit<Parameters<typeof apiClient>[1], "method" | "body">,
  ) => apiClient<T>(endpoint, { ...options, method: "POST", body }),

  put: <T>(
    endpoint: string,
    body?: any,
    options?: Omit<Parameters<typeof apiClient>[1], "method" | "body">,
  ) => apiClient<T>(endpoint, { ...options, method: "PUT", body }),

  patch: <T>(
    endpoint: string,
    body?: any,
    options?: Omit<Parameters<typeof apiClient>[1], "method" | "body">,
  ) => apiClient<T>(endpoint, { ...options, method: "PATCH", body }),

  delete: <T>(
    endpoint: string,
    options?: {
      token?: string | null;
      timeout?: number;
      retries?: number;
      retryDelay?: number;
      headers?: Record<string, string>;
      requiresAuth?: boolean;
      body?: any;
    },
  ) => apiClient<T>(endpoint, { ...options, method: "DELETE" }),
};

/**
 * Export default for convenience
 */
export default api;
