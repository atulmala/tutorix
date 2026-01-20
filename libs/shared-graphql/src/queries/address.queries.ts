import { gql } from '@apollo/client';

/**
 * Search for location suggestions (autocomplete)
 * Used for locality/address autocomplete in forms
 */
export const SEARCH_LOCATIONS = gql`
  query SearchLocations($query: String!) {
    searchLocations(query: $query) {
      displayName
      latitude
      longitude
      city
      state
      country
      postalCode
    }
  }
`;
