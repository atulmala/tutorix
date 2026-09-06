/**
 * GraphQL endpoint for the React Native app.
 *
 * Dev (`__DEV__`) may use localhost / LAN. Store/release builds never do:
 * a missing or loopback env value falls back to production HTTPS so a local
 * `.env` cannot ship into Play / App Store binaries.
 */

export const PRODUCTION_MOBILE_GRAPHQL_ENDPOINT =
  'https://www.tutorix.tech/api/graphql';

const DEV_DEFAULT_ENDPOINT = 'http://localhost:3000/api/graphql';

declare const __DEV__: boolean;

export function isInsecureMobileGraphQLEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:') {
      return true;
    }
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '10.0.2.2' ||
      host === '0.0.0.0'
    );
  } catch {
    return true;
  }
}

export function resolveMobileGraphQLEndpoint(options: {
  env?: Record<string, string | undefined>;
  isDev: boolean;
}): string {
  const env = options.env ?? {};
  const fromEnv = (
    env.NX_GRAPHQL_ENDPOINT ||
    env.GRAPHQL_ENDPOINT ||
    env.VITE_GRAPHQL_ENDPOINT ||
    ''
  ).trim();

  if (options.isDev) {
    return fromEnv || DEV_DEFAULT_ENDPOINT;
  }

  if (fromEnv && !isInsecureMobileGraphQLEndpoint(fromEnv)) {
    return fromEnv;
  }

  return PRODUCTION_MOBILE_GRAPHQL_ENDPOINT;
}

function isDevRuntime(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

/**
 * Environment variable names (in order of priority):
 * - NX_GRAPHQL_ENDPOINT
 * - GRAPHQL_ENDPOINT
 * - VITE_GRAPHQL_ENDPOINT (root `.env`; copied onto NX_ at Metro load)
 *
 * Release/store: HTTPS only. Use `TUTORIX_STORE_BUILD=1` (see
 * `apps/mobile/.env.store` and `npm run mobile:store:android` /
 * `mobile:store:ios`) so Babel inlines production URLs.
 */
export function getGraphQLEndpoint(): string {
  const env =
    typeof process !== 'undefined' && process.env ? process.env : {};
  const endpoint = resolveMobileGraphQLEndpoint({
    env,
    isDev: isDevRuntime(),
  });

  console.log('[GraphQL Endpoint - Mobile] Using endpoint:', endpoint);
  return endpoint;
}
