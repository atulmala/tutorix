/**
 * Shared GraphQL Library
 * 
 * This library contains all GraphQL queries, mutations, fragments, and Apollo Client setup
 * that are shared across all apps (web, web-admin, mobile).
 * 
 * Structure:
 * - client/      - Apollo Client setup and provider
 * - queries/     - All GraphQL queries
 * - mutations/   - All GraphQL mutations
 * - fragments/   - Reusable GraphQL fragments
 * 
 * Usage Examples:
 * 
 * 1. Setup Apollo Client in your app:
 * ```tsx
 * import { GraphQLProvider } from '@tutorix/shared-graphql';
 * 
 * function App() {
 *   return (
 *     <GraphQLProvider>
 *       <YourApp />
 *     </GraphQLProvider>
 *   );
 * }
 * ```
 * 
 * 2. Use queries:
 * ```tsx
 * import { useQuery } from '@apollo/client';
 * import { GET_CURRENT_USER } from '@tutorix/shared-graphql/queries';
 * 
 * function Component() {
 *   const { data, loading, error } = useQuery(GET_CURRENT_USER);
 *   // ...
 * }
 * ```
 * 
 * 3. Use mutations:
 * ```tsx
 * import { useMutation } from '@apollo/client';
 * import { LOGIN } from '@tutorix/shared-graphql/mutations';
 * 
 * function Component() {
 *   const [login, { loading, error }] = useMutation(LOGIN);
 *   // ...
 * }
 * ```
 */

// Export client setup
export * from './client';

// Export queries
export * from './queries';

// Export mutations
export * from './mutations';

// Export fragments
export * from './fragments';

// Utilities moved to @tutorix/shared-utils library
