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

import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';

/**
 * Get auth token from AsyncStorage
 * Returns null if token doesn't exist or AsyncStorage is not available
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.warn('Failed to get auth token:', error);
    return null;
  }
}

/**
 * Set auth token in AsyncStorage
 * @param token - JWT token to store
 */
export async function setAuthToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    // Verify token was stored successfully
    const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
    if (storedToken === token) {
      console.log('✅ Token successfully stored in AsyncStorage');
    } else {
      console.warn('⚠️ Token storage verification failed - token mismatch');
    }
  } catch (error) {
    console.warn('Failed to store auth token:', error);
  }
}

/**
 * Remove auth token from AsyncStorage
 */
export async function removeAuthToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.warn('Failed to remove auth token:', error);
  }
}