import { gql } from '@apollo/client';

/**
 * User fragment - reusable piece of GraphQL query
 * Use this in queries/mutations to ensure consistent user fields
 */
export const USER_FRAGMENT = gql`
  fragment UserFields on User {
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
`;

/**
 * User with profile fragment - extended user fields
 */
export const USER_WITH_PROFILE_FRAGMENT = gql`
  fragment UserWithProfileFields on User {
    ...UserFields
    # Add additional profile fields here
    # profilePicture
    # bio
    # etc.
  }
  ${USER_FRAGMENT}
`;
