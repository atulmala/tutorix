/**
 * Token Storage Utility
 * 
 * Provides a unified interface for storing and retrieving auth tokens
 * across web (localStorage) and React Native (AsyncStorage) platforms.
 * 
 * Usage:
 * import { setAuthToken, getAuthToken, removeAuthToken } from '@tutorix/shared-graphql/client/token-storage';
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
 * Get auth token from storage
 * Returns null if token doesn't exist or platform doesn't support storage
 */
export async function getAuthToken(): Promise<string | null> {
  if (typeof window !== 'undefined' && window.localStorage) {
    // Web: get from localStorage (synchronous)
    return localStorage.getItem(TOKEN_KEY);
  } else {
    // React Native: get from AsyncStorage (asynchronous)
    try {
      // Dynamically import AsyncStorage to avoid bundling issues in web
      const AsyncStorageModule = await import('@react-native-async-storage/async-storage');
      const AsyncStorage = AsyncStorageModule.default;
      if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
        return await AsyncStorage.getItem(TOKEN_KEY);
      }
    } catch {
      // AsyncStorage not available or not installed
      return null;
    }
  }
  return null;
}

/**
 * Set auth token in storage
 * @param token - JWT token to store
 */
export async function setAuthToken(token: string): Promise<void> {
  if (typeof window !== 'undefined' && window.localStorage) {
    // Web: store in localStorage (synchronous)
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    // React Native: store in AsyncStorage (asynchronous)
    try {
      // Dynamically import AsyncStorage to avoid bundling issues in web
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
}

/**
 * Remove auth token from storage
 */
export async function removeAuthToken(): Promise<void> {
  if (typeof window !== 'undefined' && window.localStorage) {
    // Web: remove from localStorage (synchronous)
    localStorage.removeItem(TOKEN_KEY);
  } else {
    // React Native: remove from AsyncStorage (asynchronous)
    try {
      // Dynamically import AsyncStorage to avoid bundling issues in web
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
}
