/**
 * Shared GraphQL Fragments
 * 
 * All fragments are defined here and can be imported by any app (web, web-admin, mobile)
 * 
 * Usage in queries:
 * import { USER_FRAGMENT } from '@tutorix/shared-graphql/fragments';
 * import { gql } from '@apollo/client';
 * 
 * const GET_USERS = gql`
 *   ${USER_FRAGMENT}
 *   query GetUsers {
 *     users {
 *       ...UserFields
 *     }
 *   }
 * `;
 */

export * from './user.fragments';

// Export other fragment modules here as they are created:
// export * from './tutor.fragments';
// export * from './class.fragments';
