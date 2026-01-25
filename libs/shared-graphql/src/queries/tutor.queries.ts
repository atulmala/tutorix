import { gql } from '@apollo/client';

/**
 * Get current tutor profile with addresses
 * Used to check if tutor has completed onboarding
 */
export const GET_MY_TUTOR_PROFILE = gql`
  query GetMyTutorProfile {
    myTutorProfile {
      id
      userId
      onBoardingComplete
      addresses {
        id
        street
        city
        state
        country
        fullAddress
      }
    }
  }
`;
