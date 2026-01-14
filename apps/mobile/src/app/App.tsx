import React from 'react';
// Import ApolloProvider directly from @apollo/client to avoid potential wrapper issues
import { ApolloProvider, ApolloClient, NormalizedCacheObject } from '@apollo/client';
// Import from mobile-specific client to avoid Metro bundler parsing web client (import.meta)
import { apolloClient } from '@tutorix/shared-graphql/client/mobile';
import { AppContent } from './components/AppContent';

/**
 * App component wrapped with ApolloProvider directly
 * 
 * Using ApolloProvider directly instead of GraphQLProvider wrapper to debug
 * "Invalid hook call" and "Cannot read property 'useContext' of null" errors.
 * 
 * Note: Unlike web apps where providers are wrapped in main.tsx using ReactDOM,
 * React Native's AppRegistry.registerComponent() expects a component function,
 * so we wrap the provider here in the App component itself.
 */
export const App = () => {
  // Type assertion to handle potential multiple @apollo/client instances during Metro bundling
  // Metro config should resolve to single instance, but this ensures compatibility
  return (
    <ApolloProvider client={apolloClient as unknown as ApolloClient<NormalizedCacheObject>}>
      <AppContent />
    </ApolloProvider>
  );
};

export default App;
