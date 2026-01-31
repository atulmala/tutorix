import type { FetchResult } from '@apollo/client';
import { createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { Observable } from '@apollo/client/utilities';
import { getAuthToken, getRefreshToken, setAuthTokens, removeAuthToken } from './token-storage';
import { getGraphQLEndpoint } from './endpoint';

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
 * Token is retrieved using the web token storage utility
 */
export function createAuthLink() {
  return setContext(async (operation, { headers }) => {
    // Get token from storage using web utility
    const token = await getAuthToken();

    // Debug: Log token presence for troubleshooting
    console.log(`[AuthLink] Operation: ${operation.operationName}, Token present: ${!!token}`);

    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : '',
      },
    };
  });
}

/**
 * Attempt to refresh the access token and retry the failed operation
 * Returns an Observable that forwards the retried operation's result
 */
function tryRefreshAndRetry(
  operation: Parameters<Parameters<typeof onError>[0]>[0]['operation'],
  forward: Parameters<Parameters<typeof onError>[0]>[0]['forward']
): Observable<FetchResult> {
  return new Observable<FetchResult>((observer) => {
    getRefreshToken()
      .then(async (refreshToken) => {
        if (!refreshToken) {
          console.log('[ErrorLink] No refresh token, clearing and giving up');
          await removeAuthToken();
          return forward(operation);
        }

        const endpoint = getGraphQLEndpoint();
        const refreshMutation = JSON.stringify({
          query: `mutation RefreshToken($input: RefreshTokenInput!) {
            refreshToken(input: $input) {
              accessToken
              refreshToken
            }
          }`,
          variables: { input: { refreshToken } },
        });

        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: refreshMutation,
            credentials: 'include',
          });
          const json = await res.json();

          if (json?.data?.refreshToken?.accessToken) {
            const { accessToken, refreshToken: newRefreshToken } =
              json.data.refreshToken;
            await setAuthTokens(accessToken, newRefreshToken);
            console.log('[ErrorLink] Token refreshed, retrying operation');
            return forward(operation);
          }
        } catch (err) {
          console.error('[ErrorLink] Refresh failed:', err);
        }

        await removeAuthToken();
        return forward(operation);
      })
      .then((observable) => {
        observable.subscribe({
          next: (v) => observer.next(v),
          error: (e) => observer.error(e),
          complete: () => observer.complete(),
        });
      })
      .catch((e) => observer.error(e));
  });
}

/**
 * Create error link for handling GraphQL errors
 * On UNAUTHENTICATED: attempts token refresh and retries; clears tokens only if refresh fails
 */
export function createErrorLink() {
  return onError(({ graphQLErrors, networkError, operation, forward }): Observable<FetchResult> | ReturnType<typeof forward> => {
    if (graphQLErrors) {
      const hasUnauthenticated = graphQLErrors.some(
        (e) => e.extensions?.code === 'UNAUTHENTICATED'
      );

      graphQLErrors.forEach(({ message, locations, path, extensions }) => {
        console.error(
          `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}, Extensions:`,
          extensions
        );
      });

      if (hasUnauthenticated) {
        return tryRefreshAndRetry(operation, forward);
      }
    }

    if (networkError) {
      console.error(`[Network error]: ${networkError}`);
    }

    return forward(operation);
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
