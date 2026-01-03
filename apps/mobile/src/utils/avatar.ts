import { getApiBaseUrl } from '../api/getApiBaseUrl';

export function getAvatarUrl(avatarUrl: string | null): string | null {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  // Ensure we have a proper URL
  const baseUrl = getApiBaseUrl();
  const cleanPath = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`;
  return `${baseUrl}${cleanPath}`;
}

