/**
 * Firebase Analytics Provider for Web
 * 
 * Implementation for React web applications
 */

import { getAnalytics, logEvent, setUserId, setUserProperties as setFirebaseUserProperties } from 'firebase/analytics';
import type { Analytics } from 'firebase/analytics';
import { FirebaseApp, initializeApp, getApps } from 'firebase/app';
import type { FirebaseOptions } from 'firebase/app';
import { IAnalyticsService } from './analytics.service';
import { AnalyticsEvent, UserProperties } from './types';

export class FirebaseWebAnalytics implements IAnalyticsService {
  private analytics: Analytics | null = null;
  private app: FirebaseApp | null = null;

  async initialize(config: FirebaseOptions): Promise<void> {
    try {
      // Initialize Firebase app if not already initialized
      if (getApps().length === 0) {
        this.app = initializeApp(config);
      } else {
        this.app = getApps()[0];
      }

      // Initialize Analytics
      if (typeof window !== 'undefined') {
        this.analytics = getAnalytics(this.app);
      }
    } catch (error) {
      console.error('Failed to initialize Firebase Analytics:', error);
      throw error;
    }
  }

  async trackEvent(event: AnalyticsEvent, params?: Record<string, unknown>): Promise<void> {
    if (!this.analytics) {
      console.warn('Analytics not initialized');
      return;
    }

    try {
      // Automatically include platform information for all events
      const eventParams = {
        ...params,
        platform: 'web',
      };
      logEvent(this.analytics, event as string, eventParams);
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  async trackPageView(pagePath: string, pageTitle?: string): Promise<void> {
    if (!this.analytics) {
      console.warn('Analytics not initialized');
      return;
    }

    try {
      logEvent(this.analytics, AnalyticsEvent.PAGE_VIEW as string, {
        page_path: pagePath,
        page_title: pageTitle || document.title,
        page_location: window.location.href,
        platform: 'web',
      });
    } catch (error) {
      console.error('Failed to track page view:', error);
    }
  }

  async trackScreenView(screenName: string, screenClass?: string): Promise<void> {
    // Screen views are primarily for mobile, but can be tracked on web too
    await this.trackEvent(AnalyticsEvent.SCREEN_VIEW, {
      screen_name: screenName,
      screen_class: screenClass,
    });
  }

  async setUserProperties(properties: UserProperties): Promise<void> {
    if (!this.analytics) {
      console.warn('Analytics not initialized');
      return;
    }

    try {
      setFirebaseUserProperties(this.analytics, properties as Record<string, unknown>);
    } catch (error) {
      console.error('Failed to set user properties:', error);
    }
  }

  async setUserId(userId: string | number | null): Promise<void> {
    if (!this.analytics) {
      console.warn('Analytics not initialized');
      return;
    }

    try {
      if (userId) {
        setUserId(this.analytics, String(userId));
      } else {
        setUserId(this.analytics, null as unknown as string);
      }
    } catch (error) {
      console.error('Failed to set user ID:', error);
    }
  }

  async reset(): Promise<void> {
    if (!this.analytics) {
      console.warn('Analytics not initialized');
      return;
    }

    try {
      // Firebase Analytics web SDK doesn't have resetAnalyticsData()
      // Instead, we reset user ID and clear user properties
      setUserId(this.analytics, null as unknown as string);
      // Note: Firebase web SDK doesn't provide a direct way to clear all user properties
      // Individual properties need to be set to null/undefined, which isn't possible
      // The reset is effectively done by clearing the user ID
    } catch (error) {
      console.error('Failed to reset analytics:', error);
    }
  }

  async trackError(error: Error | string, fatal = false, additionalData?: Record<string, unknown>): Promise<void> {
    if (!this.analytics) {
      console.warn('Analytics not initialized');
      return;
    }

    try {
      const errorMessage = error instanceof Error ? error.message : error;
      // Ensure platform is always included and not overridden
      logEvent(this.analytics, AnalyticsEvent.EXCEPTION as string, {
        description: errorMessage,
        fatal,
        ...additionalData,
        platform: 'web',
      });
    } catch (err) {
      console.error('Failed to track error:', err);
    }
  }
}


