/**
 * Crashlytics Service for Mobile App
 * 
 * Wrapper around Firebase Crashlytics for React Native mobile applications
 * Completely separate from Analytics implementation
 */

import { FirebaseMobileCrashlytics } from '@tutorix/analytics/firebase-crashlytics.provider';

let crashlyticsInstance: FirebaseMobileCrashlytics | null = null;

/**
 * Initialize Firebase Crashlytics
 */
export async function initializeCrashlytics(config?: Record<string, unknown>): Promise<void> {
  if (crashlyticsInstance) {
    return;
  }

  crashlyticsInstance = new FirebaseMobileCrashlytics();
  await crashlyticsInstance.initialize(config);
}

/**
 * Get crashlytics instance
 */
export function getCrashlytics(): FirebaseMobileCrashlytics {
  if (!crashlyticsInstance) {
    throw new Error('Crashlytics not initialized. Call initializeCrashlytics() first.');
  }
  return crashlyticsInstance;
}

/**
 * Log a message to Crashlytics
 */
export function log(message: string): void {
  if (!crashlyticsInstance) {
    return;
  }
  crashlyticsInstance.log(message);
}

/**
 * Set a custom attribute
 */
export function setAttribute(key: string, value: string | number | boolean): void {
  if (!crashlyticsInstance) {
    return;
  }
  crashlyticsInstance.setAttribute(key, value);
}

/**
 * Set multiple custom attributes
 */
export function setAttributes(attributes: Record<string, string | number | boolean>): void {
  if (!crashlyticsInstance) {
    return;
  }
  crashlyticsInstance.setAttributes(attributes);
}

/**
 * Set user identifier
 */
export function setUserId(userId: string): void {
  if (!crashlyticsInstance) {
    return;
  }
  crashlyticsInstance.setUserId(userId);
}

/**
 * Record a non-fatal error
 */
export function recordError(error: Error | string, jsErrorName?: string): void {
  if (!crashlyticsInstance) {
    return;
  }
  crashlyticsInstance.recordError(error, jsErrorName);
}

/**
 * Force a crash for testing (only in debug builds)
 */
export function crash(): void {
  if (!crashlyticsInstance) {
    return;
  }
  crashlyticsInstance.crash();
}

/**
 * Enable/disable Crashlytics collection
 */
export function setCrashlyticsCollectionEnabled(enabled: boolean): void {
  if (!crashlyticsInstance) {
    return;
  }
  crashlyticsInstance.setCrashlyticsCollectionEnabled(enabled);
}

/**
 * Verify Crashlytics is working by sending a test log
 */
export async function verifyCrashlytics(): Promise<boolean> {
  if (!crashlyticsInstance) {
    return false;
  }

  try {
    await crashlyticsInstance.log('Crashlytics verification test - ' + new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}

/**
 * Convenience object for common crashlytics operations
 */
export const crashlytics = {
  log,
  setAttribute,
  setAttributes,
  setUserId,
  recordError,
  crash,
  setCrashlyticsCollectionEnabled,
  verify: verifyCrashlytics,
};



