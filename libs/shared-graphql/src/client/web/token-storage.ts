/**
 * Token Storage Utility for Web
 * 
 * Provides token storage using localStorage for web applications.
 * 
 * Usage:
 * import { setAuthToken, getAuthToken, removeAuthToken } from '@tutorix/shared-graphql/client/web/token-storage';
 * 
 * // Store token after login
 * await setAuthToken('your-jwt-token');
 * 
 * // Get token
 * const token = await getAuthToken();
 * 
 * // Remove token on logout
 * await removeAuthToken();
 */

const TOKEN_KEY = 'auth_token';

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
 * Set auth token in localStorage
 * @param token - JWT token to store
 */
export async function setAuthToken(token: string): Promise<void> {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

/**
 * Remove auth token from localStorage
 */
export async function removeAuthToken(): Promise<void> {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(TOKEN_KEY);
  }
}
