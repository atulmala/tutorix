/// <reference types="vite/client" />
import { ApolloClient, from } from '@apollo/client';
import {
  createHttpLinkForClient,
  createAuthLink,
  createErrorLink,
  createRetryLink,
} from './links';
import { createCache } from './cache-config';
import { getGraphQLEndpoint } from './endpoint';

/**
 * Get NODE_ENV value from Vite environment
 */
function getNodeEnv(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env['MODE'] || import.meta.env['NODE_ENV'] || 'development';
  }
  return 'development';
}


/**
 * Create Apollo Client instance for web
 * Uses Vite's import.meta.env for environment variables
 */
export function createApolloClient() {
  console.log('[Apollo Client - Web] Creating Apollo Client instance...');
  const endpoint = getGraphQLEndpoint();
  const httpLink = createHttpLinkForClient(endpoint);
  const authLink = createAuthLink();
  const errorLink = createErrorLink();
  const retryLink = createRetryLink();

  // Chain the links
  const link = from([errorLink, retryLink, authLink, httpLink]);

  // Create cache
  const cache = createCache();

  return new ApolloClient({
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
    // Enable cache in development for debugging
    connectToDevTools: getNodeEnv() !== 'production',
  });
}

/**
 * Export default client instance
 * Apps can import this directly or create their own instance using createApolloClient()
 */
export const apolloClient = createApolloClient();
