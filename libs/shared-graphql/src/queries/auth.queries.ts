import { gql } from '@apollo/client';

/**
 * Get current authenticated user
 */
export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    me {
      id
      email
      mobileCountryCode
      mobileNumber
      firstName
      lastName
      gender
      role
      isSignupComplete
      isEmailVerified
      isMobileVerified
      createdDate
      updatedDate
    }
  }
`;

/**
 * Get user by ID
 */
export const GET_USER_BY_ID = gql`
  query GetUserById($id: ID!) {
    user(id: $id) {
      id
      email
      mobileCountryCode
      mobileNumber
      firstName
      lastName
      gender
      role
      isSignupComplete
      isEmailVerified
      isMobileVerified
      createdDate
      updatedDate
    }
  }
`;
