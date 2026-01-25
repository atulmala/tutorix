/**
 * Shared GraphQL Mutations
 * 
 * All mutations are defined here and can be imported by any app (web, web-admin, mobile)
 * 
 * Usage:
 * import { LOGIN, REGISTER_USER, GENERATE_PHONE_OTP } from '@tutorix/shared-graphql/mutations';
 * import { useMutation } from '@apollo/client';
 * 
 * function Component() {
 *   const [login, { data, loading, error }] = useMutation(LOGIN);
 *   // ...
 * }
 */

export * from './auth.mutations';
export * from './otp.mutations';
export * from './address.mutations';

// Export other mutation modules here as they are created:
// export * from './tutor.mutations';
// export * from './student.mutations';
// export * from './class.mutations';
