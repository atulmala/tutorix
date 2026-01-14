/// <reference types="vite/client" />
import { ApolloClient, from } from '@apollo/client';
import {
  createHttpLinkForClient,
  createAuthLink,
  createErrorLink,
  createRetryLink,
} from '../shared/links';
import { createCache } from '../shared/cache-config';
import { getGraphQLEndpoint as getBaseEndpoint } from '../shared/endpoint';

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
 * Get the GraphQL API endpoint for web
 * Reads from Vite environment variables (import.meta.env)
 * Falls back to process.env if available
 */
function getGraphQLEndpoint(): string {
  let endpoint: string | undefined;
  
  // Check for Vite environment variable (browser/web)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    endpoint = 
      import.meta.env['VITE_GRAPHQL_ENDPOINT'] || 
      import.meta.env['VITE_NX_GRAPHQL_ENDPOINT'] ||
      import.meta.env['NX_GRAPHQL_ENDPOINT'] ||
      import.meta.env['GRAPHQL_ENDPOINT'];
  }
  
  // Fallback to base endpoint (checks process.env)
  const finalEndpoint = endpoint || getBaseEndpoint();
  
  console.log('[GraphQL Endpoint - Web] Using endpoint:', finalEndpoint);
  if (endpoint) {
    console.log('[GraphQL Endpoint - Web] Source: Vite import.meta.env');
  } else {
    console.log('[GraphQL Endpoint - Web] Source: Fallback (shared endpoint)');
  }
  
  return finalEndpoint;
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
