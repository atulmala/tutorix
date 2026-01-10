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

/**
 * Validate reset token
 * Checks if a password reset token is valid (not expired and not used)
 */
export const VALIDATE_RESET_TOKEN = gql`
  query ValidateResetToken($token: String!) {
    validateResetToken(token: $token)
  }
`;
