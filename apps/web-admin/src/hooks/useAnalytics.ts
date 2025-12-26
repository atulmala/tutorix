/**
 * React Hook for Analytics (Web Admin)
 * 
 * Provides easy access to analytics functions in React components
 */

import { useEffect } from 'react';
import * as analyticsLib from '../lib/analytics';
import { AnalyticsEvent } from '@tutorix/analytics';

export function useAnalytics() {
  return {
    trackEvent: analyticsLib.trackEvent,
    trackPageView: analyticsLib.trackPageView,
    setUserProperties: analyticsLib.setUserProperties,
    setUserId: analyticsLib.setUserId,
    resetAnalytics: analyticsLib.resetAnalytics,
    trackError: analyticsLib.trackError,
    analytics: analyticsLib.analytics,
  };
}

/**
 * Hook to automatically track page views
 */
export function usePageTracking(pagePath: string, pageTitle?: string) {
  useEffect(() => {
    analyticsLib.trackPageView(pagePath, pageTitle);
  }, [pagePath, pageTitle]);
}

/**
 * Hook to track screen views (for mobile-like navigation in web)
 */
export function useScreenTracking(screenName: string, screenClass?: string) {
  useEffect(() => {
    analyticsLib.trackEvent(AnalyticsEvent.SCREEN_VIEW, {
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
  }, [screenName, screenClass]);
}
