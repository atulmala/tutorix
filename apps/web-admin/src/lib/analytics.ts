/**
 * Analytics Service for Web Admin App
 *
 * Wrapper around Firebase Analytics for React web applications (Admin)
 */

import { AnalyticsEvent, UserProperties, withAnalyticsContext } from '@tutorix/analytics';
import { FirebaseWebAnalytics } from '@tutorix/analytics/firebase-web.provider';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

const APP_NAME = 'admin' as const;

let analyticsInstance: FirebaseWebAnalytics | null = null;

function getEnvironment(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.NODE_ENV || import.meta.env.MODE || 'development';
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV || 'development';
  }
  return 'development';
}

export async function initializeAnalytics(config: FirebaseConfig): Promise<void> {
  if (analyticsInstance) {
    console.warn('Analytics already initialized');
    return;
  }

  analyticsInstance = new FirebaseWebAnalytics();
  await analyticsInstance.initialize(config);

  setUserProperties({ app_name: APP_NAME });
}

export function getAnalytics(): FirebaseWebAnalytics {
  if (!analyticsInstance) {
    throw new Error('Analytics not initialized. Call initializeAnalytics() first.');
  }
  return analyticsInstance;
}

export function trackEvent(event: AnalyticsEvent, params?: Record<string, unknown>): void {
  if (!analyticsInstance) {
    return;
  }
  analyticsInstance.trackEvent(
    event,
    withAnalyticsContext(params, {
      appName: APP_NAME,
      environment: getEnvironment(),
      platform: 'web',
    }),
  );
}

export function trackPageView(pagePath: string, pageTitle?: string): void {
  if (!analyticsInstance) {
    return;
  }
  trackEvent(AnalyticsEvent.PAGE_VIEW, {
    page_path: pagePath,
    page_title: pageTitle ?? pagePath,
    page_location: typeof window !== 'undefined' ? window.location.href : undefined,
  });
}

export function setUserProperties(properties: UserProperties): void {
  if (!analyticsInstance) {
    return;
  }
  analyticsInstance.setUserProperties(properties);
}

export function setUserId(userId: string | number | null): void {
  if (!analyticsInstance) {
    return;
  }
  analyticsInstance.setUserId(userId);
}

export function resetAnalytics(): void {
  if (!analyticsInstance) {
    return;
  }
  analyticsInstance.reset();
}

export function trackError(
  error: Error | string,
  fatal = false,
  additionalData?: Record<string, unknown>,
): void {
  if (!analyticsInstance) {
    return;
  }
  analyticsInstance.trackError(error, fatal, additionalData);
}

export const analytics = {
  trackRegistration: (method: string, userRole: string) => {
    trackEvent(AnalyticsEvent.USER_REGISTERED, { method, user_role: userRole });
  },
  trackLogin: (method: string, userRole: string) => {
    trackEvent(AnalyticsEvent.USER_LOGIN, { method, user_role: userRole });
  },
  trackLogout: () => {
    trackEvent(AnalyticsEvent.USER_LOGOUT);
  },
};
