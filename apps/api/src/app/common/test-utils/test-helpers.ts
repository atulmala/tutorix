/**
 * Test Helper Functions
 * 
 * Common utilities for creating test data and performing common test operations
 */

import { DataSource } from 'typeorm';
import { User } from '../../modules/auth/entities/user.entity';
import { UserRole } from '../../modules/auth/enums/user-role.enum';
import { Gender } from '../../modules/auth/enums/gender.enum';
import { PasswordService } from '../../modules/auth/services/password.service';
import { LoginInput } from '../../modules/auth/dto/login.dto';
import { AuthResponse } from '../../modules/auth/dto/auth-response.dto';
import * as crypto from 'crypto';

/**
 * Minimal interface for AuthService's login method
 * Used in test helpers to avoid circular dependencies
 */
interface AuthServiceLogin {
  login(input: LoginInput): Promise<AuthResponse>;
}

/**
 * Create a test user in the database
 * 
 * @param dataSource - TypeORM DataSource instance
 * @param userData - Optional partial user data (email, mobile, etc.)
 * @returns Created user entity
 */
export async function createTestUser(
  dataSource: DataSource,
  userData?: Partial<User>
): Promise<User> {
  const passwordService = new PasswordService();
  const defaultPassword = 'Test123456';
  const hashedPassword = await passwordService.hashPassword(defaultPassword);

  const user = dataSource.getRepository(User).create({
    email: userData?.email || `test-${crypto.randomBytes(4).toString('hex')}@example.com`,
    mobile: userData?.mobile || `+9198765${Math.floor(Math.random() * 100000)}`,
    mobileCountryCode: userData?.mobileCountryCode || '+91',
    mobileNumber: userData?.mobileNumber || `${Math.floor(Math.random() * 10000000000)}`,
    password: hashedPassword,
    role: userData?.role || UserRole.STUDENT,
    firstName: userData?.firstName || 'Test',
    lastName: userData?.lastName || 'User',
    gender: userData?.gender || Gender.OTHER,
    isSignupComplete: userData?.isSignupComplete ?? false,
    isMobileVerified: userData?.isMobileVerified ?? false,
    isEmailVerified: userData?.isEmailVerified ?? false,
    active: userData?.active ?? true,
    ...userData,
  });

  return await dataSource.getRepository(User).save(user);
}

/**
 * Create a test user with completed signup
 */
export async function createCompletedTestUser(
  dataSource: DataSource,
  userData?: Partial<User>
): Promise<User> {
  return createTestUser(dataSource, {
    ...userData,
    isSignupComplete: true,
    isMobileVerified: true,
    isEmailVerified: true,
  });
}

/**
 * Login as a test user and return JWT token
 * This is a helper that simulates the login flow for testing
 * 
 * @param authService - AuthService instance (or mock with login method)
 * @param loginId - Email or mobile number
 * @param password - User password (defaults to 'Test123456')
 * @returns JWT access token
 */
export async function loginAsTestUser(
  authService: AuthServiceLogin,
  loginId: string,
  password = 'Test123456'
): Promise<string> {
  const response = await authService.login({ loginId, password });
  return response.accessToken;
}

/**
 * Clean up test user from database
 */
export async function deleteTestUser(
  dataSource: DataSource,
  userId: number
): Promise<void> {
  await dataSource.getRepository(User).delete(userId);
}

/**
 * Clean up all test users (those with test email domain)
 */
export async function cleanupTestUsers(dataSource: DataSource): Promise<void> {
  // Delete by email pattern using query builder
  const userRepo = dataSource.getRepository(User);
  await userRepo
    .createQueryBuilder()
    .delete()
    .where('email LIKE :pattern', { pattern: 'test-%@example.com' })
    .orWhere('email LIKE :pattern2', { pattern2: 'test@example.com' })
    .execute();
}

/**
 * Generate random email for testing
 */
export function generateTestEmail(prefix = 'test'): string {
  return `${prefix}-${crypto.randomBytes(4).toString('hex')}@example.com`;
}

/**
 * Generate random mobile number for testing
 */
export function generateTestMobile(countryCode = '+91'): string {
  const randomNumber = Math.floor(1000000000 + Math.random() * 9000000000);
  return `${countryCode}${randomNumber}`;
}
