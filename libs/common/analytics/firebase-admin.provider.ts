/**
 * Firebase Admin Analytics Provider for Server-Side (NestJS API)
 * 
 * Implementation for server-side analytics using Firebase Admin SDK
 * This is used in the NestJS API backend to track events server-side
 */

import { IAnalyticsService } from './analytics.service';
import { AnalyticsEvent, UserProperties } from './types';

// Firebase Admin SDK types (will be installed as dependency)
// Using dynamic import to avoid bundling issues if not installed
type FirebaseAdminApp = any;
type FirebaseAdminAnalytics = any;

export class FirebaseAdminAnalyticsProvider implements IAnalyticsService {
  private adminApp: FirebaseAdminApp | null = null;
  private analytics: FirebaseAdminAnalytics | null = null;
  private isInitialized = false;

  async initialize(config: Record<string, unknown>): Promise<void> {
    if (this.isInitialized) {
      console.warn('Firebase Admin Analytics already initialized');
      return;
    }

    try {
      // Dynamic import to avoid issues if firebase-admin is not installed
      const admin = await import('firebase-admin');
      
      // Initialize Firebase Admin if not already initialized
      if (admin.apps.length === 0) {
        // Check if service account credentials are provided
        if (config.serviceAccount) {
          // Initialize with service account
          this.adminApp = admin.initializeApp({
            credential: admin.credential.cert(config.serviceAccount as Record<string, unknown>),
            projectId: config.projectId as string,
          });
        } else if (config.projectId) {
          // Initialize with default credentials (from environment or GCP)
          this.adminApp = admin.initializeApp({
            projectId: config.projectId as string,
          });
        } else {
          throw new Error('Firebase Admin requires either serviceAccount or projectId in config');
        }
      } else {
        this.adminApp = admin.app();
      }

      // Get Analytics instance
      // Note: Firebase Admin SDK doesn't have a direct Analytics API
      // We'll use Measurement Protocol or log events that can be processed
      // For now, we'll use console logging and can extend to use Measurement Protocol
      this.analytics = this.adminApp;
      this.isInitialized = true;
      
      console.log('✅ Firebase Admin Analytics initialized');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin Analytics:', error);
      // Don't throw - allow app to continue without analytics
      this.isInitialized = false;
    }
  }

  async trackEvent(event: AnalyticsEvent, params?: Record<string, unknown>): Promise<void> {
    if (!this.isInitialized) {
      console.warn('Analytics not initialized, event not tracked:', event);
      return;
    }

    try {
      // Firebase Admin SDK doesn't have direct Analytics API
      // We can use Google Analytics Measurement Protocol or log events
      // For now, we'll log events that can be processed by a background service
      // or sent via Measurement Protocol
      
      const eventData = {
        event_name: event,
        event_params: params || {},
        timestamp: new Date().toISOString(),
      };

      // Log event (can be extended to send via Measurement Protocol)
      console.log('[Analytics Event]', JSON.stringify(eventData));
      
      // TODO: Implement Measurement Protocol or event logging service
      // This would send events to Google Analytics via HTTP API
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  async trackPageView(pagePath: string, pageTitle?: string): Promise<void> {
    await this.trackEvent(AnalyticsEvent.PAGE_VIEW, {
      page_path: pagePath,
      page_title: pageTitle,
    });
  }

  async trackScreenView(screenName: string, screenClass?: string): Promise<void> {
    await this.trackEvent(AnalyticsEvent.SCREEN_VIEW, {
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
  }

  async setUserProperties(properties: UserProperties): Promise<void> {
    if (!this.isInitialized) {
      console.warn('Analytics not initialized, user properties not set');
      return;
    }

    try {
      // Log user properties (can be extended to send via Measurement Protocol)
      console.log('[Analytics User Properties]', JSON.stringify(properties));
      
      // TODO: Implement user property setting via Measurement Protocol
    } catch (error) {
      console.error('Failed to set user properties:', error);
    }
  }

  async setUserId(userId: string | number | null): Promise<void> {
    if (!this.isInitialized) {
      console.warn('Analytics not initialized, user ID not set');
      return;
    }

    try {
      // Log user ID (can be extended to send via Measurement Protocol)
      console.log('[Analytics User ID]', userId);
      
      // TODO: Implement user ID setting via Measurement Protocol
    } catch (error) {
      console.error('Failed to set user ID:', error);
    }
  }

  async reset(): Promise<void> {
    if (!this.isInitialized) {
      console.warn('Analytics not initialized, reset not performed');
      return;
    }

    try {
      // Reset user data
      await this.setUserId(null);
      await this.setUserProperties({});
      
      console.log('[Analytics Reset] User data cleared');
    } catch (error) {
      console.error('Failed to reset analytics:', error);
    }
  }

  async trackError(error: Error | string, fatal = false, additionalData?: Record<string, unknown>): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : error;
    
    await this.trackEvent(AnalyticsEvent.EXCEPTION, {
      description: errorMessage,
      fatal,
      ...additionalData,
    });
  }
}

