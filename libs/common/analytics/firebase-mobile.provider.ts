/**
 * Firebase Analytics Provider for React Native Mobile
 * 
 * Implementation for React Native mobile applications
 */

import analytics from '@react-native-firebase/analytics';
import { IAnalyticsService } from './analytics.service';
import { AnalyticsEvent, UserProperties } from './types';

export class FirebaseMobileAnalytics implements IAnalyticsService {
  private analyticsInstance: (() => ReturnType<typeof analytics>) | null = null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initialize(_config?: Record<string, unknown>): Promise<void> {
    try {
      console.log('🔄 Initializing Firebase Analytics (Mobile)...');
      
      // React Native Firebase Analytics initializes automatically
      // Store the analytics function that returns the instance
      this.analyticsInstance = analytics;
      
      // Get the analytics instance to verify it's working
      const analyticsInstance = this.analyticsInstance();
      
      // Enable analytics collection (disabled in debug mode by default)
      // For testing, we can enable it in debug mode
      await analyticsInstance.setAnalyticsCollectionEnabled(true);
      
      // Log a test event to verify it's working
      try {
        await analyticsInstance.logEvent('analytics_initialized', {
          platform: 'mobile',
          timestamp: new Date().toISOString(),
        });
        console.log('✅ Firebase Analytics initialized and verified (Mobile)');
        console.log('📊 Test event "analytics_initialized" sent successfully');
      } catch (testError) {
        console.warn('⚠️ Analytics initialized but test event failed:', testError);
        console.log('✅ Firebase Analytics initialized (Mobile) - but test event failed');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Analytics:', error);
      throw error;
    }
  }

  async trackEvent(event: AnalyticsEvent, params?: Record<string, unknown>): Promise<void> {
    if (!this.analyticsInstance) {
      console.warn('Analytics not initialized');
      return;
    }

    try {
      await this.analyticsInstance().logEvent(event, params);
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  async trackPageView(pagePath: string, pageTitle?: string): Promise<void> {
    // Page views are web-specific, use screen view for mobile
    await this.trackScreenView(pagePath, pageTitle);
  }

  async trackScreenView(screenName: string, screenClass?: string): Promise<void> {
    if (!this.analyticsInstance) {
      console.warn('Analytics not initialized');
      return;
    }

    try {
      await this.analyticsInstance().logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
    } catch (error) {
      console.error('Failed to track screen view:', error);
    }
  }

  async setUserProperties(properties: UserProperties): Promise<void> {
    if (!this.analyticsInstance) {
      console.warn('Analytics not initialized');
      return;
    }

    try {
      // Set individual user properties
      for (const [key, value] of Object.entries(properties)) {
        if (value !== undefined && value !== null) {
          await this.analyticsInstance().setUserProperty(String(key), String(value));
        }
      }
    } catch (error) {
      console.error('Failed to set user properties:', error);
    }
  }

  async setUserId(userId: string | number | null): Promise<void> {
    if (!this.analyticsInstance) {
      console.warn('Analytics not initialized');
      return;
    }

    try {
      if (userId) {
        await this.analyticsInstance().setUserId(String(userId));
      } else {
        await this.analyticsInstance().setUserId(null);
      }
    } catch (error) {
      console.error('Failed to set user ID:', error);
    }
  }

  async reset(): Promise<void> {
    if (!this.analyticsInstance) {
      console.warn('Analytics not initialized');
      return;
    }

    try {
      await this.analyticsInstance().resetAnalyticsData();
    } catch (error) {
      console.error('Failed to reset analytics:', error);
    }
  }

  async trackError(error: Error | string, fatal = false, additionalData?: Record<string, unknown>): Promise<void> {
    if (!this.analyticsInstance) {
      console.warn('Analytics not initialized');
      return;
    }

    try {
      const errorMessage = error instanceof Error ? error.message : error;
      await this.analyticsInstance().logEvent(AnalyticsEvent.EXCEPTION, {
        description: errorMessage,
        fatal,
        ...additionalData,
      });
    } catch (err) {
      console.error('Failed to track error:', err);
    }
  }
}

