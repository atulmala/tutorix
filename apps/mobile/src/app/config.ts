import { isProductionMobileUrl } from '@tutorix/shared-graphql/client/mobile/endpoint';

export const BRAND_NAME = 'Tutorix';

/**
 * Marketing version of this binary. Change only via
 * `npm run mobile:version:bump`, which keeps Android and iOS in sync.
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

const PRODUCTION_FRONTEND_ORIGIN = 'https://www.tutorix.tech';

export function resolveLegalOrigin(options: {
  fromEnv: string;
  isDev: boolean;
}): string {
  const fromEnv = options.fromEnv.trim().replace(/\/$/, '');
  if (options.isDev) {
    return fromEnv || 'https://dev.tutorix.tech';
  }
  return fromEnv && isProductionMobileUrl(fromEnv)
    ? fromEnv
    : PRODUCTION_FRONTEND_ORIGIN;
}

function legalOrigin(): string {
  return resolveLegalOrigin({
    fromEnv: process.env.VITE_FRONTEND_URL || process.env.NX_FRONTEND_URL || '',
    isDev: isDevRuntime(),
  });
}

export const PRIVACY_POLICY_URL = `${legalOrigin()}/privacy`;
export const TERMS_OF_SERVICE_URL = `${legalOrigin()}/terms`;
export const REFUND_POLICY_URL = `${legalOrigin()}/refunds`;
export const CONTACT_US_URL = `${legalOrigin()}/contact`;
export const DELETE_ACCOUNT_URL = `${legalOrigin()}/delete-account`;
