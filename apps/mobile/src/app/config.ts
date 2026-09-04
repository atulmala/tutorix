export const BRAND_NAME = 'Tutorix';

/**
 * Marketing version of this binary. Bump together with native
 * `versionName` (Android) / marketing version (iOS) on each store release.
 * Used by the Remote Config update gate.
 */
export const APP_VERSION = '1.0.0';

function legalOrigin(): string {
  const fromEnv = (
    process.env.VITE_FRONTEND_URL ||
    process.env.NX_FRONTEND_URL ||
    ''
  ).replace(/\/$/, '');
  return fromEnv || 'https://dev.tutorix.tech';
}

export const PRIVACY_POLICY_URL = `${legalOrigin()}/privacy`;
export const TERMS_OF_SERVICE_URL = `${legalOrigin()}/terms`;
