/**
 * Shared analytics parameter helpers used across web, mobile, and admin clients.
 */

export type AnalyticsAppName = 'web' | 'mobile' | 'admin';

export type AnalyticsPlatform = 'web' | 'ios' | 'android';

/**
 * Normalize environment name for consistent GA4 filtering.
 */
export function normalizeEnvironment(env: string): string {
  const envLower = env.toLowerCase();
  if (envLower.includes('production') || envLower === 'prod') {
    return 'production';
  }
  if (envLower.includes('staging') || envLower === 'stage') {
    return 'staging';
  }
  if (envLower.includes('development') || envLower === 'dev') {
    return 'development';
  }
  return envLower;
}

/**
 * Merge standard context params into event payloads.
 */
export function withAnalyticsContext(
  params: Record<string, unknown> | undefined,
  context: {
    appName: AnalyticsAppName;
    environment: string;
    platform?: AnalyticsPlatform;
  },
): Record<string, unknown> {
  return {
    ...params,
    app_name: context.appName,
    environment: normalizeEnvironment(context.environment),
    ...(context.platform ? { platform: context.platform } : {}),
  };
}

/**
 * GA4 custom dimensions to register in Admin (see docs/GA4_CUSTOM_DIMENSIONS.md).
 */
export const GA4_CUSTOM_DIMENSIONS = [
  'user_role',
  'platform',
  'environment',
  'app_name',
  'step_id',
  'certification_stage',
  'onboarding_complete',
] as const;
