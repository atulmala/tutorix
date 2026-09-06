export const BRAND_NAME = 'Tutorix';

/**
 * Marketing version of this binary. Bump together with native
 * `versionName` (Android) / marketing version (iOS) on each store release.
 * Used by the Remote Config update gate.
 */
export const APP_VERSION = '1.0.0';

export const ANDROID_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.tutorix.tech';

/**
 * Replace with `https://apps.apple.com/app/idXXXXXXXX` in Firebase Remote
 * Config after the first App Store listing is created.
 */
export const IOS_APP_STORE_URL = 'https://apps.apple.com/app/tutorix';

function isDevRuntime(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

function legalOrigin(): string {
  const fromEnv = (
    process.env.VITE_FRONTEND_URL ||
    process.env.NX_FRONTEND_URL ||
    ''
  ).replace(/\/$/, '');
  if (fromEnv) {
    return fromEnv;
  }
  return isDevRuntime()
    ? 'https://dev.tutorix.tech'
    : 'https://www.tutorix.tech';
}

export const PRIVACY_POLICY_URL = `${legalOrigin()}/privacy`;
export const TERMS_OF_SERVICE_URL = `${legalOrigin()}/terms`;
