/**
 * Crashlytics Service for Mobile App
 *
 * Wrapper around Firebase Crashlytics for React Native mobile applications.
 * Custom keys (environment, platform, build_type) mirror analytics for Console filtering.
 */

import { normalizeEnvironment } from '@tutorix/analytics';
import { FirebaseMobileCrashlytics } from '@tutorix/analytics/firebase-crashlytics.provider';
import { Platform } from 'react-native';

const APP_NAME = 'mobile' as const;

let crashlyticsInstance: FirebaseMobileCrashlytics | null = null;

function isDevBuild(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

function getEnvironment(): string {
  if (isDevBuild()) {
    return 'development';
  }
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    return normalizeEnvironment(process.env.NODE_ENV);
  }
  return 'production';
}

function getPlatform(): 'ios' | 'android' {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

/** Custom keys attached to every crash report for environment segregation. */
export function getCrashlyticsContext(): Record<string, string> {
  return {
    app_name: APP_NAME,
    environment: normalizeEnvironment(getEnvironment()),
    platform: getPlatform(),
    build_type: isDevBuild() ? 'debug' : 'release',
  };
}

async function applyCrashlyticsContext(): Promise<void> {
  if (!crashlyticsInstance) {
    return;
  }
  await crashlyticsInstance.setAttributes(getCrashlyticsContext());
}

/**
 * Initialize Firebase Crashlytics
 */
export async function initializeCrashlytics(config?: Record<string, unknown>): Promise<void> {
  if (crashlyticsInstance) {
    return;
  }

  crashlyticsInstance = new FirebaseMobileCrashlytics();
  await crashlyticsInstance.initialize(config);
  await crashlyticsInstance.setCrashlyticsCollectionEnabled(true);
  await applyCrashlyticsContext();
  console.log('[Crashlytics] context:', getCrashlyticsContext());
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
 * Force a crash for testing (dev builds only)
 */
export function crash(): void {
  if (!isDevBuild()) {
    console.warn('[Crashlytics] crash() is only available in dev builds');
    return;
  }
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
 * Whether Crashlytics collection is enabled on the device.
 */
export function isCrashlyticsCollectionEnabled(): boolean {
  return crashlyticsInstance?.isCollectionEnabled() ?? false;
}

/**
 * Verify Crashlytics is working. Test non-fatal is sent only in dev builds.
 */
export async function verifyCrashlytics(): Promise<boolean> {
  if (!crashlyticsInstance) {
    console.warn('[Crashlytics] verify skipped — not initialized');
    return false;
  }

  try {
    const enabled = crashlyticsInstance.isCollectionEnabled();
    console.log(`[Crashlytics] collection enabled: ${enabled}`, getCrashlyticsContext());

    return enabled;
  } catch (error) {
    console.warn('[Crashlytics] verification failed:', error);
    return false;
  }
}

/**
 * Force a native crash for Firebase Console onboarding (dev only).
 * Relaunch the app after calling this — fatals upload on next start.
 */
export function triggerTestCrash(): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) {
    console.warn('[Crashlytics] triggerTestCrash is only available in dev builds');
    return;
  }
  console.log('[Crashlytics] triggering test crash — relaunch app to upload report');
  crash();
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
  isCollectionEnabled: isCrashlyticsCollectionEnabled,
  verify: verifyCrashlytics,
  triggerTestCrash,
};



