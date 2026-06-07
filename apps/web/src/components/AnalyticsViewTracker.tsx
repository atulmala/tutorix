import { useEffect } from 'react';
import { trackPageView } from '../lib/analytics';

type AnalyticsViewTrackerProps = {
  viewName: string;
  pageTitle?: string;
};

/**
 * Tracks page_view when the active view changes (state-based navigation in web app).
 */
export function AnalyticsViewTracker({ viewName, pageTitle }: AnalyticsViewTrackerProps) {
  useEffect(() => {
    trackPageView(viewName, pageTitle);
  }, [viewName, pageTitle]);

  return null;
}
