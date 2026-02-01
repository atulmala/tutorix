import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';
import { RefreshToken } from '../entities/refresh-token.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { SessionPlatform } from '../enums/session-platform.enum';

export interface JwtPayload {
  sub: number; // user id
  sid?: number; // session id (refresh token id) for activity tracking
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
   * Generate access and refresh tokens for a user.
   * @param user - User entity
   * @param platform - web | ios | android (default: web)
   */
  async generateTokens(
    user: User,
    platform: SessionPlatform | string = SessionPlatform.web,
  ): Promise<TokenResponse> {
    let loginId: string;
    if (user.role === UserRole.ADMIN) {
      if (!user.email) throw new Error('Admin user must have an email address');
      loginId = user.email;
    } else {
      if (!user.mobile) throw new Error('Tutor/Student user must have a mobile number');
      loginId = user.mobile;
    }

    const { rawToken, entityId } = await this.generateRefreshToken(user, platform);

    const payload: JwtPayload = {
      sub: user.id,
      sid: entityId,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      loginId,
    };

    const accessToken = this.nestJwtService.sign(payload, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });

    return {
      accessToken,
      refreshToken: rawToken,
      expiresIn: 24 * 60 * 60, // 24 hours in seconds
    };
  }

  /**
   * Generate a secure refresh token and store it in the database.
   * Sets lastActivityAt = now so new sessions start as "active".
   */
  private async generateRefreshToken(
    user: User,
    platform: SessionPlatform | string = SessionPlatform.web,
  ): Promise<{ rawToken: string; entityId: number }> {
    const token = crypto.randomBytes(64).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS);

    const now = new Date();
    const effectivePlatform: SessionPlatform =
      platform === SessionPlatform.ios || platform === SessionPlatform.android
        ? platform
        : SessionPlatform.web;

    const refreshTokenEntity = this.refreshTokenRepository.create({
      token: hashedToken,
      expiresAt,
      user,
      userId: user.id,
      platform: effectivePlatform,
      lastActivityAt: now,
    });

    const saved = await this.refreshTokenRepository.save(refreshTokenEntity);
    return { rawToken: token, entityId: saved.id };
  }

  /**
   * Validate and refresh tokens. Platform is inherited from the old token if not provided.
   */
  async refreshAccessToken(
    refreshToken: string,
    platform?: SessionPlatform | string,
  ): Promise<TokenResponse> {
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const tokenEntity = await this.refreshTokenRepository.findOne({
      where: { token: hashedToken, isRevoked: false },
      relations: ['user'],
    });

    if (!tokenEntity) throw new UnauthorizedException('Invalid refresh token');
    if (new Date() > tokenEntity.expiresAt) throw new UnauthorizedException('Refresh token has expired');

    const effectivePlatform = platform || tokenEntity.platform || SessionPlatform.web;
    return this.generateTokens(tokenEntity.user, effectivePlatform);
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

