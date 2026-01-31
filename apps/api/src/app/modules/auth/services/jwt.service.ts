import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';
import { RefreshToken } from '../entities/refresh-token.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';

export interface JwtPayload {
  sub: number; // user id
  email?: string;
  mobile?: string;
  role: string;
  loginId: string; // mobile or email depending on role
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class JwtService {
  private readonly ACCESS_TOKEN_EXPIRY = '24h'; // 24 hours - refresh token handles longer sessions
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 30; // 30 days

  constructor(
    private readonly nestJwtService: NestJwtService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  /**
   * Generate access and refresh tokens for a user
   */
  async generateTokens(user: User): Promise<TokenResponse> {
    // Determine loginId based on role (ADMIN uses email, others use mobile)
    let loginId: string;
    if (user.role === UserRole.ADMIN) {
      if (!user.email) {
        throw new Error('Admin user must have an email address');
      }
      loginId = user.email;
    } else {
      if (!user.mobile) {
        throw new Error('Tutor/Student user must have a mobile number');
      }
      loginId = user.mobile;
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      loginId,
    };

    const accessToken = this.nestJwtService.sign(payload, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = await this.generateRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      expiresIn: 24 * 60 * 60, // 24 hours in seconds
    };
  }

  /**
   * Generate a secure refresh token and store it in the database
   */
  private async generateRefreshToken(user: User): Promise<string> {
    // Generate a random token
    const token = crypto.randomBytes(64).toString('hex');
    
    // Hash the token before storing
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Calculate expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS);

    // Store in database
    const refreshTokenEntity = this.refreshTokenRepository.create({
      token: hashedToken,
      expiresAt,
      user,
      userId: user.id,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    // Return the plain token (will be hashed when validated)
    return token;
  }

  /**
   * Validate and refresh tokens
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    // Hash the provided token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const tokenEntity = await this.refreshTokenRepository.findOne({
      where: { token: hashedToken, isRevoked: false },
      relations: ['user'],
    });

    if (!tokenEntity) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is expired
    if (new Date() > tokenEntity.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Generate new tokens
    return this.generateTokens(tokenEntity.user);
  }

  /**
   * Revoke a refresh token
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const hashedToken = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    await this.refreshTokenRepository.update(
      { token: hashedToken },
      { isRevoked: true, revokedAt: new Date() },
    );
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(userId: number): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() },
    );
  }

  /**
   * Verify access token and return payload
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      return this.nestJwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

