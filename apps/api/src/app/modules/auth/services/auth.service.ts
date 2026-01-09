import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';
import { Gender } from '../enums/gender.enum';
import { PasswordService } from './password.service';
import { JwtService } from './jwt.service';
import { LoginInput } from '../dto/login.dto';
import { RegisterInput } from '../dto/register.dto';
import { AuthResponse } from '../dto/auth-response.dto';
import { AnalyticsService } from '../../analytics/services/analytics.service';
import { UserSignupInput } from '../dto/user-signup.input';
import { RegisterUserInput } from '../dto/register-user.input';
import { SetPasswordInput } from '../dto/set-password.input';
import { UpdateUserInput } from '../dto/update-user.input';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<AuthResponse> {
    // Validate email (now required for all)
    if (!input.email) {
      throw new BadRequestException('Email is required for registration');
    }
    const existingEmail = await this.userRepository.findOne({
      where: { email: input.email },
    });
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Validate role-specific requirements
    if (input.role !== UserRole.ADMIN) {
      if (!input.mobile) {
        throw new BadRequestException(
          'Mobile number is required for tutor/student registration',
        );
      }
      // Check if mobile already exists
      const existingUser = await this.userRepository.findOne({
        where: { mobile: input.mobile },
      });
      if (existingUser) {
        throw new ConflictException('Mobile number already registered');
      }
    }

    // Hash password
    const hashedPassword = await this.passwordService.hashPassword(
      input.password,
    );

    // Create user
    const user = this.userRepository.create({
      email: input.email,
      mobile: input.mobile,
      password: hashedPassword,
      role: input.role,
      firstName: input.firstName,
      lastName: input.lastName,
      gender: input.gender ?? Gender.OTHER,
      isSignupComplete: false,
      isEmailVerified: input.role === UserRole.ADMIN ? false : undefined,
      isMobileVerified: input.role !== UserRole.ADMIN ? false : undefined,
    });

    const savedUser = await this.userRepository.save(user);

    // Update last login
    savedUser.lastLoginAt = new Date();
    await this.userRepository.save(savedUser);

    // Generate tokens
    const tokens = await this.jwtService.generateTokens(savedUser);

    // Track registration event
    const registrationMethod = input.role === UserRole.ADMIN ? 'email' : 'mobile';
    this.analyticsService.trackUserRegistration({
      userId: savedUser.id,
      userRole: savedUser.role,
      method: registrationMethod,
    }).catch((error) => {
      // Log but don't fail registration if analytics fails
      console.error('Failed to track registration event:', error);
    });

    return {
      ...tokens,
      user: savedUser,
    };
  }

  /**
   * Staged user creation (mobile required, email/password optional)
   * Supports resuming incomplete signups
   */
  async registerUser(input: RegisterUserInput): Promise<User> {
    const countryCode = input.mobileCountryCode || '+91';
    const mobileNumber = input.mobileNumber;
    const fullMobile = `${countryCode}${mobileNumber}`;

    if (!input.email) {
      throw new BadRequestException('Email is required for user registration');
    }

    // Check for existing user with same email or mobile
    const existingMobile = await this.userRepository.findOne({
      where: [{ mobile: fullMobile }, { mobileNumber }],
    });
    
    const existingEmail = await this.userRepository.findOne({
      where: { email: input.email },
    });

    // If user exists with same mobile or email, check if signup is incomplete
    const existingUser = existingMobile || existingEmail;

    if (existingUser) {
      // Check if signup is already completed
      if (existingUser.isSignupComplete) {
        throw new ConflictException('User already registered and signup completed');
      }

      // User exists but signup is incomplete - allow resume
      // Update user details if provided (allows updating name, etc. on resume)
      if (input.firstName !== undefined) existingUser.firstName = input.firstName;
      if (input.lastName !== undefined) existingUser.lastName = input.lastName;
      if (input.gender !== undefined) existingUser.gender = input.gender;
      if (input.role !== undefined && existingUser.role === UserRole.UNKNOWN) {
        existingUser.role = input.role;
      }

      // Update password if provided (user might want to change it on resume)
      if (input.password) {
        const hashedPassword = await this.passwordService.hashPassword(input.password);
        existingUser.password = hashedPassword;
      }

      // Ensure email and mobile are set correctly (handle case where user enters different format)
      if (!existingUser.email) existingUser.email = input.email;
      if (!existingUser.mobile) existingUser.mobile = fullMobile;
      if (!existingUser.mobileCountryCode) existingUser.mobileCountryCode = countryCode;
      if (!existingUser.mobileNumber) existingUser.mobileNumber = mobileNumber;

      const savedUser = await this.userRepository.save(existingUser);
      return savedUser;
    }

    // New user - create fresh signup
    const tempPassword =
      input.password || crypto.randomBytes(12).toString('hex');
    const hashedPassword = await this.passwordService.hashPassword(tempPassword);

    const user = this.userRepository.create({
      email: input.email,
      mobile: fullMobile,
      mobileCountryCode: countryCode,
      mobileNumber,
      password: hashedPassword, // placeholder if not provided; will be replaced by setPassword
      role: input.role ?? UserRole.UNKNOWN,
      firstName: input.firstName,
      lastName: input.lastName,
      gender: input.gender ?? Gender.OTHER,
      isSignupComplete: false,
      isMobileVerified: false,
      isEmailVerified: false,
    });

    const savedUser = await this.userRepository.save(user);
    return savedUser;
  }

  /**
   * Set or update password
   */
  async setPassword(input: SetPasswordInput): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: input.userId, active: true, deleted: false },
      select: ['id', 'password'],
    });

    if (!user) {
      throw new BadRequestException('User not found or inactive');
    }

    user.password = await this.passwordService.hashPassword(input.password);
    await this.userRepository.save(user);
    return true;
  }

  /**
   * Update an existing user (email/mobile/name/role)
   */
  async updateUser(input: UpdateUserInput): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: input.userId, deleted: false },
    });

    if (!user) {
      throw new BadRequestException('User not found or inactive');
    }

    // Email uniqueness
    if (input.email && input.email !== user.email) {
      const existingEmail = await this.userRepository.findOne({
        where: { email: input.email },
      });
      if (existingEmail) {
        throw new ConflictException('Email already registered');
      }
      user.email = input.email;
    }

    // Mobile update and uniqueness
    if (input.mobileNumber) {
      const countryCode = input.mobileCountryCode || user.mobileCountryCode || '+91';
      const fullMobile = `${countryCode}${input.mobileNumber}`;
      if (
        fullMobile !== user.mobile ||
        input.mobileNumber !== user.mobileNumber ||
        countryCode !== user.mobileCountryCode
      ) {
        const existingMobile = await this.userRepository.findOne({
          where: [{ mobile: fullMobile }, { mobileNumber: input.mobileNumber }],
        });
        if (existingMobile && existingMobile.id !== user.id) {
          throw new ConflictException('Mobile number already registered');
        }
        user.mobileCountryCode = countryCode;
        user.mobileNumber = input.mobileNumber;
        user.mobile = fullMobile;
        user.isMobileVerified = false; // reset if mobile changed
      }
    }

    if (input.firstName !== undefined) user.firstName = input.firstName;
    if (input.lastName !== undefined) user.lastName = input.lastName;
    if (input.role !== undefined) user.role = input.role;
    if (input.gender !== undefined) user.gender = input.gender;
    if (input.isSignupComplete !== undefined)
      user.isSignupComplete = input.isSignupComplete;

    const saved = await this.userRepository.save(user);
    return saved;
  }

  /**
   * User signup (declares intent as Tutor or Student). No profile created here.
   */
  async userSignup(input: UserSignupInput): Promise<AuthResponse> {
    const countryCode = input.mobileCountryCode || '+91';
    const mobileNumber = input.mobileNumber;
    const fullMobile = `${countryCode}${mobileNumber}`;

    // Validate email unique
    const existingEmail = await this.userRepository.findOne({
      where: { email: input.email },
    });
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Validate mobile present/unique
    const existing = await this.userRepository.findOne({
      where: [{ mobile: fullMobile }, { mobileNumber }],
    });
    if (existing) {
      throw new ConflictException('Mobile number already registered');
    }

    // Use provided role or default to UNKNOWN
    const role = input.role ?? UserRole.UNKNOWN;

    const hashedPassword = await this.passwordService.hashPassword(
      input.password,
    );

    const user = this.userRepository.create({
      email: input.email,
      mobile: fullMobile,
      mobileCountryCode: countryCode,
      mobileNumber,
      password: hashedPassword,
      role,
      firstName: input.firstName,
      lastName: input.lastName,
      gender: input.gender ?? Gender.OTHER,
      isSignupComplete: false,
      isMobileVerified: false,
    });

    const savedUser = await this.userRepository.save(user);
    const tokens = await this.jwtService.generateTokens(savedUser);

    this.analyticsService
      .trackUserRegistration({
        userId: savedUser.id,
        userRole: savedUser.role,
        method: 'mobile',
      })
      .catch((error) =>
        console.error('Failed to track registration event:', error),
      );

    return {
      ...tokens,
      user: savedUser,
    };
  }

  /**
   * Login user with mobile (tutors/students) or email (admins)
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    // Determine if loginId is email or mobile based on format
    const isEmail = input.loginId.includes('@');

    let user: User | null = null;

    if (isEmail) {
      // Admin login - search by email
      user = await this.userRepository.findOne({
        where: { email: input.loginId },
        relations: ['tutor'],
        select: [
          'id',
          'email',
          'mobile',
          'password',
          'role',
          'firstName',
          'lastName',
          'profilePicture',
          'isEmailVerified',
          'isMobileVerified',
          'active',
          'lastLoginAt',
          'createdDate',
          'updatedDate',
          'version',
          'm_id',
        ],
      });
    } else {
      // Tutor/Student login - search by mobile
      user = await this.userRepository.findOne({
        where: { mobile: input.loginId },
        relations: ['tutor'],
        select: [
          'id',
          'email',
          'mobile',
          'password',
          'role',
          'firstName',
          'lastName',
          'profilePicture',
          'isEmailVerified',
          'isMobileVerified',
          'active',
          'lastLoginAt',
          'createdDate',
          'updatedDate',
          'version',
          'm_id',
        ],
      });
    }

    if (!user) {
      throw new UnauthorizedException('Invalid login credentials');
    }

    // Verify password
    const isPasswordValid = await this.passwordService.comparePassword(
      input.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid login credentials');
    }

    // Check if user is active
    if (!user.active) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.jwtService.generateTokens(user);

    // Track login event
    const loginMethod = isEmail ? 'email' : 'mobile';
    this.analyticsService.trackUserLogin({
      userId: user.id,
      userRole: user.role,
      method: loginMethod,
    }).catch((error) => {
      // Log but don't fail login if analytics fails
      console.error('Failed to track login event:', error);
    });

    return {
      ...tokens,
      user,
    };
  }

  /**
   * Validate user by ID (used by JWT strategy)
   */
  async validateUser(userId: number): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId, active: true },
      relations: ['tutor'],
    });

    return user || null;
  }

  /**
   * Get user by ID
   */
  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['tutor'],
    });
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const tokens = await this.jwtService.refreshAccessToken(refreshToken);

    // Get user from the new access token
    const payload = this.jwtService.verifyAccessToken(tokens.accessToken);
    const user = await this.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      ...tokens,
      user,
    };
  }

  /**
   * Logout - revoke refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    // Get user ID from refresh token before revoking (for analytics)
    let userId: number | null = null;
    try {
      const { RefreshToken } = await import('../entities/refresh-token.entity');
      const crypto = await import('crypto');
      const hashedToken = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');
      
      const tokenEntity = await this.userRepository.manager
        .getRepository(RefreshToken)
        .findOne({
          where: { token: hashedToken },
          relations: ['user'],
        });
      
      if (tokenEntity?.user) {
        userId = tokenEntity.user.id;
      }
    } catch {
      // If we can't get user ID, continue with logout anyway
    }
    
    await this.jwtService.revokeRefreshToken(refreshToken);
    
    // Track logout event if we have user ID
    if (userId) {
      this.analyticsService.trackUserLogout(userId).catch((error) => {
        console.error('Failed to track logout event:', error);
      });
    }
  }

  /**
   * Logout from all devices - revoke all refresh tokens
   */
  async logoutAll(userId: number): Promise<void> {
    await this.jwtService.revokeAllUserTokens(userId);
    
    // Track logout event
    this.analyticsService.trackUserLogout(userId).catch((error) => {
      console.error('Failed to track logout event:', error);
    });
  }
}
