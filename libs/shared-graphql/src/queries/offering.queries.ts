import { gql } from '@apollo/client';

/**
 * Get full offering tree for tutor offering selection.
 * Fetched once when Offerings step loads; frontend builds dropdowns from cached data.
 */
export const GET_OFFERINGS = gql`
  query GetOfferings {
    offerings {
      id
      name
      displayName
      level
      order
      parentOffering {
        id
      }
      rootOffering {
        id
      }
    }
  }
`;
