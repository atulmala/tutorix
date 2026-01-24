import React from 'react';
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

// CRITICAL: Ensure React is available globally before Apollo Client uses it
// Apollo Client's context.cjs internally uses React.useContext, and if React
// is null or from a different instance, it will fail
if (typeof global !== 'undefined') {
  if (!global.React) {
    global.React = React;
    console.log('[Apollo Client - Mobile] 🔧 Set global.React for Apollo Client');
  } else if (global.React !== React) {
    console.warn('[Apollo Client - Mobile] ⚠️ global.React differs from imported React, updating...');
    global.React = React;
  }
}

/**
 * Get NODE_ENV value from process.env (React Native)
 */
function getNodeEnv(): string {
  if (typeof process !== 'undefined' && process.env) {
    return process.env['NODE_ENV'] || 'development';
  }
  return 'development';
}

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
    // Enable cache in development for debugging
    connectToDevTools: getNodeEnv() !== 'production',
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

// Export as a getter to enable lazy initialization
export const apolloClient = new Proxy({} as ReturnType<typeof createApolloClient>, {
  get(_target, prop) {
    const client = getApolloClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
  ownKeys() {
    const client = getApolloClient();
    return Object.keys(client);
  },
  getOwnPropertyDescriptor(_target, prop) {
    const client = getApolloClient();
    return Object.getOwnPropertyDescriptor(client, prop);
  },
});
