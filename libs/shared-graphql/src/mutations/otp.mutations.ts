import { gql } from '@apollo/client';

/**
 * Generate OTP mutation
 * Generates an OTP for phone or email verification
 * 
 * @param userId - The user ID (obtained from registerUser)
 * @param purpose - Either MOBILE_VERIFICATION or EMAIL_VERIFICATION
 */
export const GENERATE_OTP = gql`
  mutation GenerateOtp($input: GenerateOtpInput!) {
    generateOtp(input: $input) {
      userId
      purpose
      expiresAt
      otp
    }
  }
`;

/**
 * Generate OTP for phone verification
 * Convenience wrapper for MOBILE_VERIFICATION
 */
export const GENERATE_PHONE_OTP = gql`
  mutation GeneratePhoneOtp($userId: Int!) {
    generateOtp(
      input: {
        userId: $userId
        purpose: MOBILE_VERIFICATION
      }
    ) {
      userId
      purpose
      expiresAt
      otp
    }
  }
`;

/**
 * Generate OTP for email verification
 * Convenience wrapper for EMAIL_VERIFICATION
 */
export const GENERATE_EMAIL_OTP = gql`
  mutation GenerateEmailOtp($userId: Int!) {
    generateOtp(
      input: {
        userId: $userId
        purpose: EMAIL_VERIFICATION
      }
    ) {
      userId
      purpose
      expiresAt
      otp
    }
  }
`;

/**
 * Verify OTP mutation
 * Verifies the OTP for phone or email verification
 * 
 * @param userId - The user ID
 * @param purpose - Either MOBILE_VERIFICATION or EMAIL_VERIFICATION
 * @param otp - The 6-digit OTP code
 * @param timestamp - Current timestamp (ISO date string)
 */
export const VERIFY_OTP = gql`
  mutation VerifyOtp($input: VerifyOtpInput!) {
    verifyOtp(input: $input) {
      success
      message
    }
  }
`;

/**
 * Verify phone OTP
 * Convenience wrapper for MOBILE_VERIFICATION
 * Note: timestamp should be a Date object or ISO date string
 */
export const VERIFY_PHONE_OTP = gql`
  mutation VerifyPhoneOtp($userId: Int!, $otp: String!, $timestamp: DateTime!) {
    verifyOtp(
      input: {
        userId: $userId
        purpose: MOBILE_VERIFICATION
        otp: $otp
        timestamp: $timestamp
      }
    ) {
      success
      message
    }
  }
`;

/**
 * Verify email OTP
 * Convenience wrapper for EMAIL_VERIFICATION
 * Note: timestamp should be a Date object or ISO date string
 */
export const VERIFY_EMAIL_OTP = gql`
  mutation VerifyEmailOtp($userId: Int!, $otp: String!, $timestamp: DateTime!) {
    verifyOtp(
      input: {
        userId: $userId
        purpose: EMAIL_VERIFICATION
        otp: $otp
        timestamp: $timestamp
      }
    ) {
      success
      message
    }
  }
`;
