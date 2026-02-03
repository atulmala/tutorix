import { ApolloClient, from } from '@apollo/client';
import { Platform } from 'react-native';

import {
  createHttpLinkForClient,
  createAuthLink,
  createErrorLink,
  createRetryLink,
} from './links';
import { createCache } from './cache-config';
import { getGraphQLEndpoint } from './endpoint';

/**
 * Get GraphQL endpoint for mobile
 * Handles Android emulator special case (10.0.2.2 instead of localhost)
 */
function getMobileGraphQLEndpoint(): string {
  let endpoint = getGraphQLEndpoint();
  
  // For Android emulator, replace localhost with 10.0.2.2
  // iOS simulator works fine with localhost
  if (Platform.OS === 'android' && endpoint.includes('localhost')) {
    endpoint = endpoint.replace('localhost', '10.0.2.2');
    console.log('[Apollo Client - Mobile] Android detected, using:', endpoint);
  }
  
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
