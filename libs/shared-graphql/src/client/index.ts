/**
 * Apollo Client Setup with Auto-Detection
 * 
 * Automatically detects the platform and exports the appropriate client:
 * - Web/Web-Admin: Uses web client (import.meta.env)
 * - Mobile: Uses mobile client (process.env)
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

// Import web client (for web/web-admin apps)
// Mobile apps should import directly from './mobile' to avoid Metro parsing import.meta
import * as webClient from './web';

// Shared utilities have been moved to platform-specific locations
// Use './mobile' or './web' directly instead

// Export web client for web/web-admin apps
// Note: Mobile apps should use '@tutorix/shared-graphql/client/mobile' instead
export const GraphQLProvider = webClient.GraphQLProvider;
export const createApolloClient = webClient.createApolloClient;
export const apolloClient = webClient.apolloClient;
export type GraphQLProviderProps = webClient.GraphQLProviderProps;
