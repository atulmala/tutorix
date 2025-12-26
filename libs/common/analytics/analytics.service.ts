/**
 * Analytics Service Interface
 * 
 * Abstract interface for analytics providers.
 * Implementations should handle platform-specific tracking.
 */

import {
  AnalyticsEvent,
  UserProperties,
} from './types';

export interface IAnalyticsService {
  /**
   * Initialize analytics with configuration
   */
  initialize(config: Record<string, unknown>): Promise<void> | void;

  /**
   * Track an event
   */
  trackEvent(event: AnalyticsEvent, params?: Record<string, unknown>): Promise<void> | void;

  /**
   * Track a page view (web)
   */
  trackPageView(pagePath: string, pageTitle?: string): Promise<void> | void;

  /**
   * Track a screen view (mobile)
   */
  trackScreenView(screenName: string, screenClass?: string): Promise<void> | void;

  /**
   * Set user properties
   */
  setUserProperties(properties: UserProperties): Promise<void> | void;

  /**
   * Set user ID
   */
  setUserId(userId: string | number | null): Promise<void> | void;

  /**
   * Clear user data (on logout)
   */
  reset(): Promise<void> | void;

  /**
   * Track an error
   */
  trackError(error: Error | string, fatal?: boolean, additionalData?: Record<string, unknown>): Promise<void> | void;
}


