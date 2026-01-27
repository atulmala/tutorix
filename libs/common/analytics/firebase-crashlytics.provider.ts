/**
 * Firebase Crashlytics Provider for React Native Mobile
 * 
 * Implementation for React Native mobile applications
 * Completely separate from Analytics implementation
 */

import crashlytics from '@react-native-firebase/crashlytics';

export interface ICrashlyticsService {
  /**
   * Initialize Crashlytics with configuration
   */
  initialize(config?: Record<string, unknown>): Promise<void> | void;

  /**
   * Log a message to Crashlytics
   */
  log(message: string): Promise<void> | void;

  /**
   * Set a custom key-value pair
   */
  setAttribute(key: string, value: string | number | boolean): Promise<void> | void;

  /**
   * Set multiple custom attributes
   */
  setAttributes(attributes: Record<string, string | number | boolean>): Promise<void> | void;

  /**
   * Set user identifier
   */
  setUserId(userId: string): Promise<void> | void;

  /**
   * Record a non-fatal error
   */
  recordError(error: Error | string, jsErrorName?: string): Promise<void> | void;

  /**
   * Force a crash for testing (only in debug builds)
   */
  crash(): void;

  /**
   * Enable/disable Crashlytics collection
   */
  setCrashlyticsCollectionEnabled(enabled: boolean): Promise<void> | void;
}

export class FirebaseMobileCrashlytics implements ICrashlyticsService {
  private crashlyticsInstance: ReturnType<typeof crashlytics> | null = null;

  async initialize(config?: Record<string, unknown>): Promise<void> {
    try {
      // Currently unused, but kept for API compatibility
      void config;
      // React Native Firebase Crashlytics initializes automatically when the app starts
      // The native modules are linked via autolinking
      // We just need to ensure the crashlytics instance is ready
      this.crashlyticsInstance = crashlytics();
      
      console.log('[Crashlytics] Instance created successfully');
      
      // Enable crashlytics collection (disabled in debug mode by default)
      // For production, crashlytics collection is enabled by default
      // Enable it for debug mode to test and see errors during development
      // You can disable this if you don't want debug errors in Crashlytics
      if (__DEV__) {
        try {
          await this.crashlyticsInstance.setCrashlyticsCollectionEnabled(true);
          console.log('[Crashlytics] ✅ Enabled for debug mode');
        } catch (enableError) {
          console.warn('[Crashlytics] ⚠️ Could not enable collection (may already be enabled):', enableError);
        }
      } else {
        console.log('[Crashlytics] Production mode - collection enabled by default');
      }
    } catch (error) {
      console.error('[Crashlytics] ❌ Failed to initialize Firebase Crashlytics:', error);
      throw error;
    }
  }

  async log(message: string): Promise<void> {
    if (!this.crashlyticsInstance) {
      console.warn('Crashlytics not initialized');
      return;
    }

    try {
      await this.crashlyticsInstance.log(message);
    } catch (error) {
      console.error('Failed to log to Crashlytics:', error);
    }
  }

  async setAttribute(key: string, value: string | number | boolean): Promise<void> {
    if (!this.crashlyticsInstance) {
      console.warn('Crashlytics not initialized');
      return;
    }

    try {
      await this.crashlyticsInstance.setAttribute(key, String(value));
    } catch (error) {
      console.error('Failed to set Crashlytics attribute:', error);
    }
  }

  async setAttributes(attributes: Record<string, string | number | boolean>): Promise<void> {
    if (!this.crashlyticsInstance) {
      console.warn('Crashlytics not initialized');
      return;
    }

    try {
      for (const [key, value] of Object.entries(attributes)) {
        await this.crashlyticsInstance.setAttribute(key, String(value));
      }
    } catch (error) {
      console.error('Failed to set Crashlytics attributes:', error);
    }
  }

  async setUserId(userId: string): Promise<void> {
    if (!this.crashlyticsInstance) {
      console.warn('Crashlytics not initialized');
      return;
    }

    try {
      await this.crashlyticsInstance.setUserId(userId);
    } catch (error) {
      console.error('Failed to set Crashlytics user ID:', error);
    }
  }

  async recordError(error: Error | string, jsErrorName?: string): Promise<void> {
    if (!this.crashlyticsInstance) {
      console.warn('[Crashlytics] Not initialized - cannot record error');
      return;
    }

    try {
      console.log('[Crashlytics] Recording error...');
      console.log('[Crashlytics] Error:', error instanceof Error ? error.message : error);
      console.log('[Crashlytics] Error name:', jsErrorName || 'UnnamedError');
      
      if (error instanceof Error) {
        await this.crashlyticsInstance.recordError(error, jsErrorName);
        console.log('[Crashlytics] ✅ Error recorded successfully');
      } else {
        // Create an Error object from string
        const errorObj = new Error(error);
        await this.crashlyticsInstance.recordError(errorObj, jsErrorName);
        console.log('[Crashlytics] ✅ Error recorded successfully (from string)');
      }
    } catch (err) {
      console.error('[Crashlytics] ❌ Failed to record error to Crashlytics:', err);
    }
  }

  crash(): void {
    if (!this.crashlyticsInstance) {
      console.warn('[Crashlytics] Not initialized - cannot trigger crash');
      return;
    }

    try {
      console.log('[Crashlytics] 🚨 Triggering test crash...');
      this.crashlyticsInstance.crash();
    } catch (error) {
      console.error('[Crashlytics] ❌ Failed to trigger crash:', error);
    }
  }

  async setCrashlyticsCollectionEnabled(enabled: boolean): Promise<void> {
    if (!this.crashlyticsInstance) {
      console.warn('Crashlytics not initialized');
      return;
    }

    try {
      await this.crashlyticsInstance.setCrashlyticsCollectionEnabled(enabled);
    } catch (error) {
      console.error('Failed to set Crashlytics collection enabled:', error);
    }
  }
}



