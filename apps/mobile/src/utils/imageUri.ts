import { getApiBaseUrl } from "../api/getApiBaseUrl";

const INVALID_SENTINELS = new Set(["null", "undefined"]);

function isAbsoluteUri(uri: string): boolean {
  return (
    uri.startsWith("http://") ||
    uri.startsWith("https://") ||
    uri.startsWith("file:") ||
    uri.startsWith("content:") ||
    uri.startsWith("asset:")
  );
}

export function getSafeImageUri(rawUri?: string | null): string | null {
  if (!rawUri) return null;

  const trimmed = rawUri.trim();
  if (!trimmed || INVALID_SENTINELS.has(trimmed.toLowerCase())) return null;

  const normalized = isAbsoluteUri(trimmed)
    ? trimmed
    : `${getApiBaseUrl()}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;

  try {
    return encodeURI(normalized);
  } catch {
    return null;
  }
}
