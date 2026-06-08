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
      void config;
      console.log('🔄 Initializing Firebase Crashlytics (Mobile)...');
      this.crashlyticsInstance = crashlytics();

      // Collection + custom keys are configured by the mobile wrapper after initialize().
      const collectionEnabled = this.crashlyticsInstance.isCrashlyticsCollectionEnabled;
      console.log(
        collectionEnabled
          ? '✅ Firebase Crashlytics initialized (Mobile) — collection enabled'
          : '⚠️ Firebase Crashlytics initialized (Mobile) — collection still disabled',
      );
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Crashlytics:', error);
      throw error;
    }
  }

  isCollectionEnabled(): boolean {
    return this.crashlyticsInstance?.isCrashlyticsCollectionEnabled ?? false;
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
      console.warn('Crashlytics not initialized');
      return;
    }

    try {
      if (error instanceof Error) {
        await this.crashlyticsInstance.recordError(error, jsErrorName);
      } else {
        // Create an Error object from string
        const errorObj = new Error(error);
        await this.crashlyticsInstance.recordError(errorObj, jsErrorName);
      }
    } catch (err) {
      console.error('Failed to record error to Crashlytics:', err);
    }
  }

  crash(): void {
    if (!this.crashlyticsInstance) {
      console.warn('Crashlytics not initialized');
      return;
    }

    try {
      this.crashlyticsInstance.crash();
    } catch (error) {
      console.error('Failed to trigger crash:', error);
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



