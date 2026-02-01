import { gql } from '@apollo/client';

/**
 * Login mutation
 * Authenticates a user with loginId (email or mobile) and password
 */
export const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      refreshToken
      user {
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
  }
`;

/**
 * Register user mutation
 * Creates a new user account with basic details (step 1 of signup)
 * This is called from the basic details form
 * Returns the user object without auth tokens (since email/phone aren't verified yet)
 */
export const REGISTER_USER = gql`
  mutation RegisterUser(
    $role: UserRole!
    $mobileCountryCode: String!
    $mobileNumber: String!
    $email: String!
    $password: String
    $firstName: String
    $lastName: String
    $gender: Gender!
    $dob: DateTime
  ) {
    registerUser(
      input: {
        role: $role
        mobileCountryCode: $mobileCountryCode
        mobileNumber: $mobileNumber
        email: $email
        password: $password
        firstName: $firstName
        lastName: $lastName
        gender: $gender
        dob: $dob
      }
    ) {
      id
      email
      mobileCountryCode
      mobileNumber
      firstName
      lastName
      gender
      dob
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
 * User signup mutation (alternative - creates user with auth tokens)
 * Use REGISTER_USER if you want to handle OTP verification separately
 */
export const SIGN_UP = gql`
  mutation UserSignup(
    $email: String!
    $password: String!
    $mobileCountryCode: String
    $mobileNumber: String!
    $firstName: String
    $lastName: String
    $gender: Gender!
    $role: UserRole!
  ) {
    userSignup(
      input: {
        email: $email
        password: $password
        mobileCountryCode: $mobileCountryCode
        mobileNumber: $mobileNumber
        firstName: $firstName
        lastName: $lastName
        gender: $gender
        role: $role
      }
    ) {
      accessToken
      refreshToken
      user {
        id
        email
        mobileCountryCode
        mobileNumber
        firstName
        lastName
        gender
        role
        createdDate
        updatedDate
      }
    }
  }
`;

/**
 * Refresh access token using refresh token
 */
export const REFRESH_TOKEN = gql`
  mutation RefreshToken($input: RefreshTokenInput!) {
    refreshToken(input: $input) {
      accessToken
      refreshToken
    }
  }
`;

/**
 * Heartbeat: keeps session marked as active for inactive-session tracking.
 * Call periodically (e.g. every 2 min) when app is in foreground and user is logged in.
 */
export const HEARTBEAT = gql`
  mutation Heartbeat {
    heartbeat
  }
`;

/**
 * Example mutation: Logout
 */
export const LOGOUT = gql`
  mutation Logout {
    logout
  }
`;

/**
 * Forgot password mutation
 * Sends password reset link to user's email
 */
export const FORGOT_PASSWORD = gql`
  mutation ForgotPassword($input: ForgotPasswordInput!) {
    forgotPassword(input: $input)
  }
`;

/**
 * Reset password mutation
 * Resets user password using the token from email
 */
export const RESET_PASSWORD = gql`
  mutation ResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input)
  }
`;
