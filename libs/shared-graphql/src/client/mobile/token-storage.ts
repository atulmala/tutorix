/**
 * Token Storage Utility for Mobile (React Native)
 *
 * Stores the access token in the iOS Keychain / Android Keystore via
 * react-native-keychain. Tokens written by older builds to AsyncStorage are
 * moved into secure storage on first read so upgrading users stay signed in.
 *
 * Usage:
 * import { setAuthToken, getAuthToken, removeAuthToken } from '@tutorix/shared-graphql/client/mobile/token-storage';
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

export const AUTH_TOKEN_KEYCHAIN_SERVICE = 'tutorix.auth';
export const LEGACY_AUTH_TOKEN_STORAGE_KEY = 'auth_token';

const KEYCHAIN_USERNAME = 'access_token';

/**
 * Every API request reads the token, so keep it in memory after the first
 * Keychain read. `undefined` means not loaded yet.
 */
let cachedToken: string | null | undefined;

async function readKeychainToken(): Promise<string | null> {
  const creds = await Keychain.getGenericPassword({
    service: AUTH_TOKEN_KEYCHAIN_SERVICE,
  });
  return creds && typeof creds.password === 'string' ? creds.password : null;
}

async function writeKeychainToken(token: string): Promise<void> {
  await Keychain.setGenericPassword(KEYCHAIN_USERNAME, token, {
    service: AUTH_TOKEN_KEYCHAIN_SERVICE,
    // Background push handlers may call the API while the device is locked.
    accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
}

async function migrateLegacyToken(): Promise<string | null> {
  const legacy = await AsyncStorage.getItem(LEGACY_AUTH_TOKEN_STORAGE_KEY);
  if (!legacy) {
    return null;
  }
  try {
    await writeKeychainToken(legacy);
    await AsyncStorage.removeItem(LEGACY_AUTH_TOKEN_STORAGE_KEY);
  } catch (error) {
    // Keep the legacy copy so the next launch can retry the move.
    console.warn('Failed to migrate auth token to secure storage:', error);
  }
  return legacy;
}

/**
 * Get the auth token from secure storage.
 * Returns null if no token exists or secure storage is unavailable.
 */
export async function getAuthToken(): Promise<string | null> {
  if (cachedToken !== undefined) {
    return cachedToken;
  }
  try {
    cachedToken = (await readKeychainToken()) ?? (await migrateLegacyToken());
    return cachedToken;
  } catch (error) {
    console.warn('Failed to get auth token:', error);
    return null;
  }
}

/**
 * Store the auth token in secure storage.
 * @param token - JWT token to store
 */
export async function setAuthToken(token: string): Promise<void> {
  cachedToken = token;
  try {
    await writeKeychainToken(token);
  } catch (error) {
    console.warn('Failed to store auth token:', error);
  }
}

/**
 * Remove the auth token from secure storage (and any legacy copy).
 */
export async function removeAuthToken(): Promise<void> {
  cachedToken = null;
  try {
    await Keychain.resetGenericPassword({ service: AUTH_TOKEN_KEYCHAIN_SERVICE });
    await AsyncStorage.removeItem(LEGACY_AUTH_TOKEN_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to remove auth token:', error);
  }
}

/** Test-only: forget the in-memory token so the next read hits storage. */
export function resetAuthTokenCacheForTests(): void {
  cachedToken = undefined;
}
