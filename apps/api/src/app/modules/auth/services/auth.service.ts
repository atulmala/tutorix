import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';
import { PasswordService } from './password.service';
import { JwtService } from './jwt.service';
import { LoginInput } from '../dto/login.dto';
import { RegisterInput } from '../dto/register.dto';
import { AuthResponse } from '../dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<AuthResponse> {
    // Validate role-specific requirements
    if (input.role === UserRole.ADMIN) {
      if (!input.email) {
        throw new BadRequestException(
          'Email is required for admin registration',
        );
      }
      // Check if email already exists
      const existingUser = await this.userRepository.findOne({
        where: { email: input.email },
      });
      if (existingUser) {
        throw new ConflictException('Email already registered');
      }
    } else {
      // TUTOR or STUDENT
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
      isEmailVerified: input.role === UserRole.ADMIN ? false : undefined,
      isMobileVerified: input.role !== UserRole.ADMIN ? false : undefined,
    });

    const savedUser = await this.userRepository.save(user);

    // Update last login
    savedUser.lastLoginAt = new Date();
    await this.userRepository.save(savedUser);

    // Generate tokens
    const tokens = await this.jwtService.generateTokens(savedUser);

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
    });

    return user || null;
  }

  /**
   * Get user by ID
   */
  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
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
    await this.jwtService.revokeRefreshToken(refreshToken);
  }

  /**
   * Logout from all devices - revoke all refresh tokens
   */
  async logoutAll(userId: number): Promise<void> {
    await this.jwtService.revokeAllUserTokens(userId);
  }
}
