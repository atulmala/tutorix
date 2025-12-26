/**
 * React Hook for Analytics (Mobile)
 * 
 * Provides easy access to analytics functions in React Native components
 */

import { useEffect } from 'react';
import * as analyticsLib from '../lib/analytics';

export function useAnalytics() {
  return {
    trackEvent: analyticsLib.trackEvent,
    trackScreenView: analyticsLib.trackScreenView,
    setUserProperties: analyticsLib.setUserProperties,
    setUserId: analyticsLib.setUserId,
    resetAnalytics: analyticsLib.resetAnalytics,
    trackError: analyticsLib.trackError,
    analytics: analyticsLib.analytics,
  };
}

/**
 * Hook to automatically track screen views
 */
export function useScreenTracking(screenName: string, screenClass?: string) {
  useEffect(() => {
    analyticsLib.trackScreenView(screenName, screenClass);
  }, [screenName, screenClass]);
}


