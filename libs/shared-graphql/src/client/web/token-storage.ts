/**
 * Token Storage Utility for Web
 *
 * Provides token storage using localStorage for web applications.
 *
 * Usage:
 * import { setAuthTokens, getAuthToken, getRefreshToken, removeAuthToken } from '@tutorix/shared-graphql/client/web/token-storage';
 *
 * // Store tokens after login
 * await setAuthTokens(accessToken, refreshToken);
 *
 * // Get token for requests
 * const token = await getAuthToken();
 */

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

/**
 * Get auth token from localStorage
 * Returns null if token doesn't exist or localStorage is not available
 */
export async function getAuthToken(): Promise<string | null> {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

/**
 * Get refresh token from localStorage
 */
export async function getRefreshToken(): Promise<string | null> {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }
  return null;
}

/**
 * Set auth token in localStorage (legacy - use setAuthTokens for both)
 * @param token - JWT token to store
 */
export async function setAuthToken(token: string): Promise<void> {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

/**
 * Set both access and refresh tokens
 */
export async function setAuthTokens(
  accessToken: string,
  refreshToken?: string
): Promise<void> {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  }
}

/**
 * Remove auth tokens from localStorage
 */
export async function removeAuthToken(): Promise<void> {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}
