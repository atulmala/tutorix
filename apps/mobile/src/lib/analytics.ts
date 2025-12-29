/**
 * Analytics Service for Mobile App
 * 
 * Wrapper around Firebase Analytics for React Native mobile applications
 */

import { AnalyticsEvent, UserProperties } from '@tutorix/analytics';
import { FirebaseMobileAnalytics } from '@tutorix/analytics/firebase-mobile.provider';

let analyticsInstance: FirebaseMobileAnalytics | null = null;

/**
 * Initialize Firebase Analytics
 */
export async function initializeAnalytics(config?: Record<string, unknown>): Promise<void> {
  if (analyticsInstance) {
    console.warn('⚠️ Analytics already initialized');
    return;
  }

  console.log('🔄 Starting Firebase Analytics initialization...');
  analyticsInstance = new FirebaseMobileAnalytics();
  await analyticsInstance.initialize(config);
  console.log('✅ Analytics initialization complete');
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
    console.warn('Analytics not initialized');
    return;
  }
  analyticsInstance.trackEvent(event, params);
}

/**
 * Track screen view (mobile)
 */
export function trackScreenView(screenName: string, screenClass?: string): void {
  if (!analyticsInstance) {
    console.warn('Analytics not initialized');
    return;
  }
  analyticsInstance.trackScreenView(screenName, screenClass);
}

/**
 * Set user properties
 */
export function setUserProperties(properties: UserProperties): void {
  if (!analyticsInstance) {
    console.warn('Analytics not initialized');
    return;
  }
  analyticsInstance.setUserProperties(properties);
}

/**
 * Set user ID
 */
export function setUserId(userId: string | number | null): void {
  if (!analyticsInstance) {
    console.warn('Analytics not initialized');
    return;
  }
  analyticsInstance.setUserId(userId);
}

/**
 * Reset analytics (on logout)
 */
export function resetAnalytics(): void {
  if (!analyticsInstance) {
    console.warn('Analytics not initialized');
    return;
  }
  analyticsInstance.reset();
}

/**
 * Track error
 */
export function trackError(error: Error | string, fatal = false, additionalData?: Record<string, unknown>): void {
  if (!analyticsInstance) {
    console.warn('Analytics not initialized');
    return;
  }
  analyticsInstance.trackError(error, fatal, additionalData);
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
    console.warn('⚠️ Analytics not initialized - cannot verify');
    return false;
  }

  try {
    console.log('🧪 Verifying analytics by sending test event...');
    trackEvent(AnalyticsEvent.BUTTON_CLICK, {
      button_name: 'analytics_verification_test',
      test: true,
      timestamp: new Date().toISOString(),
    });
    console.log('✅ Analytics verification test event sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Analytics verification failed:', error);
    return false;
  }
}


