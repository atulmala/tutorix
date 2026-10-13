import { ApolloClient, from } from '@apollo/client';
import { NativeModules, Platform } from 'react-native';

import {
  createHttpLinkForClient,
  createAuthLink,
  createErrorLink,
  createRetryLink,
} from './links';
import { createCache } from './cache-config';
import {
  looksLikeAndroidEmulator,
  resolveMobileDevEndpoint,
} from './dev-endpoint';
import { getGraphQLEndpoint } from './endpoint';

function isAndroidEmulator(): boolean {
  if (Platform.OS !== 'android') {
    return false;
  }
  const constants = Platform.constants as {
    Model?: string;
    Fingerprint?: string;
  };
  return looksLikeAndroidEmulator({
    model: constants.Model,
    fingerprint: constants.Fingerprint,
  });
}

function getMetroPackagerHost(): string | null {
  try {
    const scriptURL = NativeModules.SourceCode?.scriptURL as string | undefined;
    if (!scriptURL) {
      return null;
    }
    const host = new URL(scriptURL).hostname;
    if (!host || host === 'localhost' || host === '127.0.0.1') {
      return null;
    }
    return host;
  } catch {
    return null;
  }
}

function getDevLanHost(): string | null {
  // Must use `process.env` (not globalThis) so Metro/Babel inline DEV_LAN_HOST on device builds.
  const fromEnv = process.env.DEV_LAN_HOST;
  if (fromEnv && fromEnv !== 'localhost' && fromEnv !== '127.0.0.1') {
    return fromEnv;
  }
  return null;
}

/**
 * GraphQL URL for this device.
 * Android phone: 127.0.0.1 + `adb reverse tcp:3000`. Emulator: 10.0.2.2.
 * iOS uses the Metro host, then DEV_LAN_HOST.
 */
export function getMobileGraphQLEndpoint(): string {
  const endpoint = resolveMobileDevEndpoint({
    endpoint: getGraphQLEndpoint(),
    platform: Platform.OS,
    metroHost: getMetroPackagerHost(),
    devLanHost: getDevLanHost(),
    isAndroidEmulator: isAndroidEmulator(),
  });
  console.log('[GraphQL Endpoint - Mobile] Device endpoint:', endpoint);
  return endpoint;
}

/**
 * Create Apollo Client instance for mobile
 * Uses process.env for environment variables (React Native)
 */
export function createApolloClient() {
  console.log('[Apollo Client - Mobile] Creating Apollo Client instance...');
  const endpoint = getMobileGraphQLEndpoint();
  const httpLink = createHttpLinkForClient(endpoint);
  const authLink = createAuthLink();
  const errorLink = createErrorLink();
  const retryLink = createRetryLink();

  // Chain the links
  const link = from([errorLink, retryLink, authLink, httpLink]);

  // Create cache
  const cache = createCache();

  const client = new ApolloClient({
    link,
    cache,
    defaultOptions: {
      watchQuery: {
        errorPolicy: 'all',
        fetchPolicy: 'cache-and-network',
      },
      query: {
        errorPolicy: 'all',
        fetchPolicy: 'cache-first',
      },
      mutate: {
        errorPolicy: 'all',
      },
    },
    // Note: connectToDevTools is deprecated in Apollo Client 3.14+
    // DevTools will auto-connect in development mode (when __DEV__ is true)
    // Removing the option to avoid deprecation warnings
  });
  
  console.log('[Apollo Client - Mobile] Apollo Client created successfully');
  return client;
}

/**
 * Export default client instance with lazy initialization
 * Client is created on first access, not at module load time
 * This prevents initialization errors from blocking the app from loading
 */
let _apolloClient: ReturnType<typeof createApolloClient> | null = null;
let _initializationError: Error | null = null;

function getApolloClient(): ReturnType<typeof createApolloClient> {
  if (_apolloClient) {
    return _apolloClient;
  }
  
  if (_initializationError) {
    throw _initializationError;
  }
  
  try {
    _apolloClient = createApolloClient();
    return _apolloClient;
  } catch (error) {
    _initializationError = error instanceof Error ? error : new Error(String(error));
    console.error('[Apollo Client - Mobile] Error creating client:', error);
    throw _initializationError;
  }
}

// Export client instance - created lazily on first access
// This is accessed via a getter to ensure lazy initialization
// The actual client is created when apolloClient is first accessed
export const apolloClient = (() => {
  // Return a Proxy that creates the client on first property access
  // This ensures the client is only created when actually used
  return new Proxy({} as ReturnType<typeof createApolloClient>, {
    get(_target, prop) {
      const client = getApolloClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const value = (client as any)[prop];
      if (typeof value === 'function') {
        return (value as (...args: unknown[]) => unknown).bind(client);
      }
      return value;
    },
  });
})();
