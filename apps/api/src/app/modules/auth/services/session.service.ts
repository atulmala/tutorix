import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';

/** Inactivity threshold: no API call or heartbeat in this many minutes = inactive */
const INACTIVITY_MINUTES = 5;

/** Throttle: don't update lastActivityAt more than once per minute per session */
const UPDATE_THROTTLE_MINUTES = 1;

export interface SessionStats {
  total: number;
  active: number;
  inactive: number;
  byPlatform: { web: number; ios: number; android: number };
}

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  /**
   * Update lastActivityAt for the given session (refresh token id).
   * Throttled: only updates if lastActivityAt is older than UPDATE_THROTTLE_MINUTES.
   */
  async updateLastActivity(sessionId: number): Promise<void> {
    const throttleMs = UPDATE_THROTTLE_MINUTES * 60 * 1000;
    const threshold = new Date(Date.now() - throttleMs);

    await this.refreshTokenRepository
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ lastActivityAt: () => 'CURRENT_TIMESTAMP' })
      .where('id = :sessionId', { sessionId })
      .andWhere('isRevoked = false')
      .andWhere('(lastActivityAt IS NULL OR lastActivityAt < :threshold)', {
        threshold,
      })
      .execute();
  }

  /**
   * Get session statistics: total, active (activity in last 5 min), inactive.
   */
  async getSessionStats(): Promise<SessionStats> {
    const now = new Date();
    const inactiveThreshold = new Date(
      now.getTime() - INACTIVITY_MINUTES * 60 * 1000,
    );

    const total = await this.refreshTokenRepository
      .createQueryBuilder('rt')
      .where('rt.isRevoked = false')
      .andWhere('rt.expiresAt > :now', { now })
      .getCount();

    const active = await this.refreshTokenRepository
      .createQueryBuilder('rt')
      .where('rt.isRevoked = false')
      .andWhere('rt.expiresAt > :now', { now })
      .andWhere('(COALESCE(rt.lastActivityAt, rt.createdDate) >= :threshold)', {
        threshold: inactiveThreshold,
      })
      .getCount();

    const inactive = await this.refreshTokenRepository
      .createQueryBuilder('rt')
      .where('rt.isRevoked = false')
      .andWhere('rt.expiresAt > :now', { now })
      .andWhere('(COALESCE(rt.lastActivityAt, rt.createdDate) < :threshold)', {
        threshold: inactiveThreshold,
      })
      .getCount();

    const byPlatformRaw = await this.refreshTokenRepository
      .createQueryBuilder('rt')
      .select('rt.platform', 'platform')
      .addSelect('COUNT(*)', 'count')
      .where('rt.isRevoked = false')
      .andWhere('rt.expiresAt > :now', { now })
      .groupBy('rt.platform')
      .getRawMany<{ platform: string | null; count: string }>();

    const byPlatform = { web: 0, ios: 0, android: 0 };
    for (const row of byPlatformRaw) {
      const p = (row.platform || 'web').toLowerCase();
      const count = parseInt(row.count, 10);
      if (p === 'web') byPlatform.web += count;
      else if (p === 'ios') byPlatform.ios += count;
      else if (p === 'android') byPlatform.android += count;
      else byPlatform.web += count;
    }

    return { total, active, inactive, byPlatform };
  }
}
