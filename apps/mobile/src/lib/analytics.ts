/**
 * Analytics Service for Mobile App
 * 
 * Wrapper around Firebase Analytics for React Native mobile applications
 */

import { AnalyticsEvent, UserProperties, withAnalyticsContext } from '@tutorix/analytics';
import { FirebaseMobileAnalytics } from '@tutorix/analytics/firebase-mobile.provider';
import { Platform } from 'react-native';
import { recordError as recordCrashlyticsError } from './crashlytics';

const APP_NAME = 'mobile' as const;

let analyticsInstance: FirebaseMobileAnalytics | null = null;

function getEnvironment(): string {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return 'development';
  }
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    return process.env.NODE_ENV;
  }
  return 'production';
}

function getPlatform(): 'ios' | 'android' {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

/**
 * Initialize Firebase Analytics
 */
export async function initializeAnalytics(config?: Record<string, unknown>): Promise<void> {
  if (analyticsInstance) {
    return;
  }

  analyticsInstance = new FirebaseMobileAnalytics();
  await analyticsInstance.initialize(config);
}

/**
 * Get analytics instance
 */
export function getAnalytics(): FirebaseMobileAnalytics {
  if (!analyticsInstance) {
    throw new Error('Analytics not initialized. Call initializeAnalytics() first.');
  }
  return analyticsInstance;
}

/**
 * Track an event
 */
export function trackEvent(event: AnalyticsEvent, params?: Record<string, unknown>): void {
  if (!analyticsInstance) {
    return;
  }
  analyticsInstance.trackEvent(
    event,
    withAnalyticsContext(params, {
      appName: APP_NAME,
      environment: getEnvironment(),
      platform: getPlatform(),
    }),
  );
}

/**
 * Track screen view (mobile)
 */
export function trackScreenView(screenName: string, screenClass?: string): void {
  if (!analyticsInstance) {
    return;
  }
  analyticsInstance.trackScreenView(screenName, screenClass);
}

/**
 * Set user properties
 */
export function setUserProperties(properties: UserProperties): void {
  if (!analyticsInstance) {
    return;
  }
  analyticsInstance.setUserProperties(properties);
}

/**
 * Set user ID
 */
export function setUserId(userId: string | number | null): void {
  if (!analyticsInstance) {
    return;
  }
  analyticsInstance.setUserId(userId);
}

/**
 * Reset analytics (on logout)
 */
export function resetAnalytics(): void {
  if (!analyticsInstance) {
    return;
  }
  analyticsInstance.reset();
}

/**
 * Track error
 */
export function trackError(error: Error | string, fatal = false, additionalData?: Record<string, unknown>): void {
  if (analyticsInstance) {
    analyticsInstance.trackError(error, fatal, additionalData);
  }

  const crashlyticsError =
    error instanceof Error ? error : new Error(error);
  recordCrashlyticsError(crashlyticsError, fatal ? 'FatalError' : 'NonFatalError');
}

/**
 * Convenience functions for common events
 */
export const analytics = {
  // User events
  trackRegistration: (method: string, userRole: string) => {
    trackEvent(AnalyticsEvent.USER_REGISTERED, { method, user_role: userRole });
  },
  trackLogin: (method: string, userRole: string) => {
    trackEvent(AnalyticsEvent.USER_LOGIN, { method, user_role: userRole });
  },
  trackLogout: () => {
    trackEvent(AnalyticsEvent.USER_LOGOUT);
  },

  // Navigation
  trackNavigation: (from: string, to: string) => {
    trackEvent(AnalyticsEvent.NAVIGATION, { from, to });
  },

  // Actions
  trackButtonClick: (buttonName: string, location?: string) => {
    trackEvent(AnalyticsEvent.BUTTON_CLICK, { button_name: buttonName, button_location: location });
  },

  // Business events
  trackTutorSearch: (searchTerm?: string, filters?: Record<string, unknown>, resultsCount?: number) => {
    trackEvent(AnalyticsEvent.TUTOR_SEARCH, { search_term: searchTerm, search_filters: filters, results_count: resultsCount });
  },
  trackTutorViewed: (tutorId: string | number) => {
    trackEvent(AnalyticsEvent.TUTOR_VIEWED, { tutor_id: tutorId });
  },
  trackTutorBooked: (tutorId: string | number, value?: number, currency = 'USD') => {
    trackEvent(AnalyticsEvent.TUTOR_BOOKED, { tutor_id: tutorId, value, currency });
  },
  trackPaymentInitiated: (amount: number, currency = 'USD', paymentMethod?: string) => {
    trackEvent(AnalyticsEvent.PAYMENT_INITIATED, { amount, currency, payment_method: paymentMethod });
  },
  trackPaymentCompleted: (amount: number, currency = 'USD', transactionId?: string) => {
    trackEvent(AnalyticsEvent.PAYMENT_COMPLETED, { amount, currency, transaction_id: transactionId });
  },
};

/**
 * Verify analytics is working by sending a test event
 */
export async function verifyAnalytics(): Promise<boolean> {
  if (!analyticsInstance) {
    return false;
  }

  try {
    trackEvent(AnalyticsEvent.BUTTON_CLICK, {
      button_name: 'analytics_verification_test',
      test: true,
      timestamp: new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}


