/**
 * Mobile-specific Apollo Client Setup
 * 
 * This is the mobile entry point that only uses mobile-specific client.
 * It does not import web client to avoid Metro bundler parsing issues.
 * 
 * Usage:
 * import { GraphQLProvider, createApolloClient } from '@tutorix/shared-graphql/client/mobile';
 * 
 * // In your app root:
 * <GraphQLProvider>
 *   <App />
 * </GraphQLProvider>
 */

export * from './apollo-client';
export * from './apollo-provider';
// Shared utilities have been moved to platform-specific locations
// Do NOT export from '../shared' to avoid Metro bundling web-specific code
