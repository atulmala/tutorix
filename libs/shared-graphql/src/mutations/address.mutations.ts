import { gql } from '@apollo/client';

/**
 * Create address for tutor
 * Used during tutor onboarding to add their address
 */
export const CREATE_TUTOR_ADDRESS = gql`
  mutation CreateTutorAddress($input: CreateAddressInput!) {
    createTutorAddress(input: $input) {
      id
      type
      street
      subArea
      city
      state
      country
      landmark
      postalCode
      fullAddress
      latitude
      longitude
      verified
      primary
      createdDate
      updatedDate
    }
  }
`;
