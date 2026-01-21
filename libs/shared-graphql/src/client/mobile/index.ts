/**
 * Mobile-specific Apollo Client Setup
 * 
 * This is the mobile entry point that only uses mobile-specific client.
 * It does not import web client to avoid Metro bundler parsing issues.
 * 
 * Usage:
 * import { ApolloProvider } from '@apollo/client';
 * import { apolloClient } from '@tutorix/shared-graphql/client/mobile';
 * 
 * // In your app root:
 * <ApolloProvider client={apolloClient}>
 *   <App />
 * </ApolloProvider>
 * 
 * NOTE: Mobile apps should use ApolloProvider directly (not a wrapper component)
 * to avoid React Native context issues. The GraphQLProvider wrapper causes
 * "Invalid hook call" and "Cannot read property 'useContext' of null" errors.
 */

export * from './apollo-client';
// Shared utilities have been moved to platform-specific locations
// Do NOT export from '../shared' to avoid Metro bundling web-specific code
