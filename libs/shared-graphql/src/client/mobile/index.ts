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
export * from '../shared';
