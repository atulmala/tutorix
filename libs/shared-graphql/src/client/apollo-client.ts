import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { getAuthToken, removeAuthToken } from './token-storage';

/**
 * Get NODE_ENV value from environment
 * Supports Vite (import.meta.env) and Node.js/React Native (process.env)
 */
function getNodeEnv(): string {
  // Check for Vite environment variable (browser/web)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env['MODE'] || import.meta.env['NODE_ENV'] || 'development';
  }
  
  // Check for Node.js/React Native environment variable
  if (typeof process !== 'undefined' && process.env) {
    return process.env['NODE_ENV'] || 'development';
  }
  
  return 'development';
}

/**
 * Get the GraphQL API endpoint
 * Reads from environment variables (.env file)
 * Defaults to localhost:3000/graphql for development
 * 
 * Environment variable names (in order of priority):
 * - VITE_GRAPHQL_ENDPOINT (for Vite/web apps)
 * - NX_GRAPHQL_ENDPOINT (for Nx projects)
 * - GRAPHQL_ENDPOINT (fallback)
 * 
 * Supports:
 * - Vite: uses import.meta.env (requires VITE_ prefix)
 * - React Native/Node: uses process.env
 */
export function getGraphQLEndpoint(): string {
  let endpoint: string | undefined;
  
  // Check for Vite environment variable (browser/web)
  // Vite exposes env vars - we check multiple possible names
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    endpoint = 
      import.meta.env['VITE_GRAPHQL_ENDPOINT'] || 
      import.meta.env['VITE_NX_GRAPHQL_ENDPOINT'] ||
      import.meta.env['NX_GRAPHQL_ENDPOINT'] ||
      import.meta.env['GRAPHQL_ENDPOINT'];
  }
  
  // Check for Node.js/React Native environment variable
  if (!endpoint && typeof process !== 'undefined' && process.env) {
    endpoint = 
      process.env['VITE_GRAPHQL_ENDPOINT'] ||
      process.env['NX_GRAPHQL_ENDPOINT'] || 
      process.env['GRAPHQL_ENDPOINT'];
  }
  
  // Default endpoint (matches backend: http://localhost:3000/api/graphql)
  // Backend uses global prefix 'api' set in main.ts
  return endpoint || 'http://localhost:3000/api/graphql';
}

/**
 * Create HTTP link for Apollo Client
 */
function createHttpLinkForClient() {
  return createHttpLink({
    uri: getGraphQLEndpoint(),
    credentials: 'include',
  });
}

/**
 * Create auth link that adds JWT token to requests
 * Token is retrieved using the unified token storage utility
 */
function createAuthLink() {
  return setContext(async (_, { headers }) => {
    // Get token from storage using unified utility
    const token = await getAuthToken();

    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : '',
      },
    };
  });
}

/**
 * Create error link for handling GraphQL errors
 */
function createErrorLink() {
  return onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors) {
      graphQLErrors.forEach(({ message, locations, path, extensions }) => {
        console.error(
          `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
        );
        
        // Handle authentication errors
        if (extensions?.code === 'UNAUTHENTICATED') {
          // Clear token (fire and forget)
          removeAuthToken().catch(console.error);
          // Optionally redirect to login page (web only)
          if (typeof window !== 'undefined') {
            // window.location.href = '/login';
          }
        }
      });
    }

    if (networkError) {
      console.error(`[Network error]: ${networkError}`);
    }
  });
}

/**
 * Create retry link for handling network failures
 */
function createRetryLink() {
  return new RetryLink({
    delay: {
      initial: 300,
      max: Infinity,
      jitter: true,
    },
    attempts: {
      max: 3,
      retryIf: (error) => {
        // Retry on network errors but not on GraphQL errors
        return !!error && !!error.networkError;
      },
    },
  });
}

/**
 * Create Apollo Client instance
 * This is the shared client configuration that all apps will use
 */
export function createApolloClient() {
  const httpLink = createHttpLinkForClient();
  const authLink = createAuthLink();
  const errorLink = createErrorLink();
  const retryLink = createRetryLink();

  // Chain the links
  const link = from([errorLink, retryLink, authLink, httpLink]);

  // Create cache with recommended configuration
  const cache = new InMemoryCache({
    typePolicies: {
      // Add type policies for better cache management
      Query: {
        fields: {
          // Add field policies here if needed
        },
      },
    },
  });

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
