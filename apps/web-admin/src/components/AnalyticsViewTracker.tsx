import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../lib/analytics';

/**
 * Tracks page_view on React Router navigation in the admin app.
 */
export function AnalyticsViewTracker() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname || '/';
    trackPageView(path, `Admin ${path}`);
  }, [location.pathname]);

  return null;
}
