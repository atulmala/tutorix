/**
 * Analytics Service for Web App
 * 
 * Wrapper around Firebase Analytics for React web applications
 */

import { FirebaseWebAnalytics, AnalyticsEvent, UserProperties } from '@tutorix/analytics';

// Firebase config - will be loaded from environment variables
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

let analyticsInstance: FirebaseWebAnalytics | null = null;

/**
 * Initialize Firebase Analytics
 */
export async function initializeAnalytics(config: FirebaseConfig): Promise<void> {
  if (analyticsInstance) {
    console.warn('Analytics already initialized');
    return;
  }

  analyticsInstance = new FirebaseWebAnalytics();
  await analyticsInstance.initialize(config);
}

/**
 * Get analytics instance
 */
export function getAnalytics(): FirebaseWebAnalytics {
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
 * Track page view
 */
export function trackPageView(pagePath: string, pageTitle?: string): void {
  if (!analyticsInstance) {
    console.warn('Analytics not initialized');
    return;
  }
  analyticsInstance.trackPageView(pagePath, pageTitle);
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
  trackLinkClick: (linkUrl: string, linkText?: string) => {
    trackEvent(AnalyticsEvent.LINK_CLICK, { link_url: linkUrl, link_text: linkText });
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


