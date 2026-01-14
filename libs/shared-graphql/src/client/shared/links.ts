import { createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { getAuthToken, removeAuthToken } from './token-storage';

/**
 * Create HTTP link for Apollo Client
 */
export function createHttpLinkForClient(endpoint: string) {
  return createHttpLink({
    uri: endpoint,
    credentials: 'include',
  });
}

/**
 * Create auth link that adds JWT token to requests
 * Token is retrieved using the unified token storage utility
 */
export function createAuthLink() {
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
export function createErrorLink() {
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
export function createRetryLink() {
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
