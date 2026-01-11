/**
 * Shared GraphQL Queries
 * 
 * All queries are defined here and can be imported by any app (web, web-admin, mobile)
 * 
 * Usage:
 * import { GET_CURRENT_USER } from '@tutorix/shared-graphql/queries';
 * import { useQuery } from '@apollo/client';
 * 
 * function Component() {
 *   const { data, loading, error } = useQuery(GET_CURRENT_USER);
 *   // ...
 * }
 */

export * from './auth.queries';

// Export other query modules here as they are created:
// export * from './tutor.queries';
// export * from './student.queries';
// export * from './class.queries';
