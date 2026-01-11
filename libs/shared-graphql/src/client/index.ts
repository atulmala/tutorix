/**
 * Apollo Client Setup
 * 
 * This module provides the Apollo Client configuration and provider
 * that all apps (web, web-admin, mobile) can use.
 * 
 * Usage:
 * import { GraphQLProvider, createApolloClient } from '@tutorix/shared-graphql/client';
 * 
 * // In your app root:
 * <GraphQLProvider>
 *   <App />
 * </GraphQLProvider>
 * 
 * // Or with custom client:
 * const client = createApolloClient();
 * <GraphQLProvider client={client}>
 *   <App />
 * </GraphQLProvider>
 */

export * from './apollo-client';
export * from './apollo-provider';
export * from './token-storage';
