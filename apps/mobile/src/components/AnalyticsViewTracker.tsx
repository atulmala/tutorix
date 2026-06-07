import { useEffect } from 'react';
import { trackScreenView } from '../lib/analytics';

type AnalyticsViewTrackerProps = {
  screenName: string;
  screenClass?: string;
};

/**
 * Tracks screen_view when the active screen changes in the mobile app.
 */
export function AnalyticsViewTracker({ screenName, screenClass }: AnalyticsViewTrackerProps) {
  useEffect(() => {
    trackScreenView(screenName, screenClass ?? screenName);
  }, [screenName, screenClass]);

  return null;
}
