/**
 * Token Storage Utility for Mobile (React Native)
 * 
 * Provides token storage using AsyncStorage for React Native applications.
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

const TOKEN_KEY = 'auth_token';

/**
 * Get auth token from AsyncStorage
 * Returns null if token doesn't exist or AsyncStorage is not available
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const AsyncStorageModule = await import('@react-native-async-storage/async-storage');
    const AsyncStorage = AsyncStorageModule.default;
    if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
      return await AsyncStorage.getItem(TOKEN_KEY);
    }
  } catch {
    // AsyncStorage not available or not installed
    return null;
  }
  return null;
}

/**
 * Set auth token in AsyncStorage
 * @param token - JWT token to store
 */
export async function setAuthToken(token: string): Promise<void> {
  try {
    const AsyncStorageModule = await import('@react-native-async-storage/async-storage');
    const AsyncStorage = AsyncStorageModule.default;
    if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    }
  } catch (error) {
    // AsyncStorage not available or not installed
    console.warn('Failed to store auth token:', error);
  }
}

/**
 * Remove auth token from AsyncStorage
 */
export async function removeAuthToken(): Promise<void> {
  try {
    const AsyncStorageModule = await import('@react-native-async-storage/async-storage');
    const AsyncStorage = AsyncStorageModule.default;
    if (AsyncStorage && typeof AsyncStorage.removeItem === 'function') {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  } catch (error) {
    // AsyncStorage not available or not installed
    console.warn('Failed to remove auth token:', error);
  }
}
