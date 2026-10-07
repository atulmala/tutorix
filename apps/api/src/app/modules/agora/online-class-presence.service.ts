import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../auth/enums/user-role.enum';
import {
  AGORA_RTC_JOIN_EVENT,
  AGORA_RTC_LEAVE_EVENT,
  AgoraRtcChannelNotice,
  agoraLeaveDurationSeconds,
  agoraNoticeTimestamp,
  sessionIdFromAgoraChannel,
} from './agora-rtc-webhook.util';
import {
  OnlineClassParticipantUsage,
  OnlineClassUsage,
} from './dto/online-class-usage.dto';
import { OnlineClassPresenceEntity } from './entities/online-class-presence.entity';

export type AgoraRtcIngestResult = 'stored' | 'duplicate' | 'ignored';

@Injectable()
export class OnlineClassPresenceService {
  constructor(
    @InjectRepository(OnlineClassPresenceEntity)
    private readonly presenceRepo: Repository<OnlineClassPresenceEntity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async ingest(notice: AgoraRtcChannelNotice): Promise<AgoraRtcIngestResult> {
    const noticeId = notice.noticeId?.trim();
    if (!noticeId) {
      return 'ignored';
    }
    const sessionId = sessionIdFromAgoraChannel(notice.payload?.channelName);
    const userId = Number(notice.payload?.uid);
    if (sessionId == null || !Number.isInteger(userId) || userId <= 0) {
      return 'ignored';
    }

    if (notice.eventType === AGORA_RTC_JOIN_EVENT) {
      return this.recordJoin(noticeId, sessionId, userId, notice.payload?.ts);
    }
    if (notice.eventType === AGORA_RTC_LEAVE_EVENT) {
      return this.recordLeave(
        noticeId,
        sessionId,
        userId,
        notice.payload?.ts,
        notice.payload?.duration,
        notice.payload?.reason,
      );
    }
    return 'ignored';
  }

  /**
   * Closed seconds are Agora's leave durations. An open stretch contributes
   * provisional seconds from joinedAt until now, and that provisional time is
   * replaced (not added) when the leave arrives.
   */
  async usage(sessionId: number, now: Date = new Date()): Promise<OnlineClassUsage> {
    const rows = await this.presenceRepo.find({
      where: { sessionId, deleted: false },
    });
    const byUser = new Map<number, OnlineClassPresenceEntity[]>();
    for (const row of rows) {
      const list = byUser.get(row.userId) ?? [];
      list.push(row);
      byUser.set(row.userId, list);
    }

    const userIds = [...byUser.keys()];
    const users = userIds.length
      ? await this.userRepo.find({ where: { id: In(userIds) } })
      : [];
    const userById = new Map(users.map((user) => [user.id, user]));

    const participants = [...byUser.entries()]
      .map(([userId, stretches]) => this.toParticipant(userId, stretches, userById.get(userId), now))
      .sort((a, b) => a.userId - b.userId);

    const closedSeconds = participants.reduce((sum, participant) => sum + participant.closedSeconds, 0);
    return {
      sessionId,
      closedSeconds,
      closedMinutes: closedSeconds / 60,
      participants,
    };
  }

  private async recordJoin(
    noticeId: string,
    sessionId: number,
    userId: number,
    ts: number | undefined,
  ): Promise<AgoraRtcIngestResult> {
    const existing = await this.presenceRepo.findOne({ where: { joinNoticeId: noticeId } });
    if (existing) {
      return 'duplicate';
    }
    const joinedAt = agoraNoticeTimestamp(ts);
    const row = this.presenceRepo.create({
      joinNoticeId: noticeId,
      sessionId,
      userId,
      joinedAt,
      leftAt: null,
      durationSeconds: null,
      leaveReason: null,
      deleted: false,
    });
    await this.presenceRepo.save(row);
    return 'stored';
  }

  private async recordLeave(
    noticeId: string,
    sessionId: number,
    userId: number,
    ts: number | undefined,
    duration: number | undefined,
    reason: number | undefined,
  ): Promise<AgoraRtcIngestResult> {
    const existing = await this.presenceRepo.findOne({ where: { leaveNoticeId: noticeId } });
    if (existing) {
      return 'duplicate';
    }

    const leftAt = agoraNoticeTimestamp(ts);
    const durationSeconds = agoraLeaveDurationSeconds(duration);
    const open = await this.findOpenStretch(sessionId, userId, leftAt);
    if (open) {
      open.leaveNoticeId = noticeId;
      open.leftAt = leftAt;
      open.durationSeconds = durationSeconds;
      open.leaveReason = this.leaveReason(reason);
      await this.presenceRepo.save(open);
      return 'stored';
    }

    const joinedAt =
      leftAt && durationSeconds != null
        ? new Date(leftAt.getTime() - durationSeconds * 1000)
        : null;
    const row = this.presenceRepo.create({
      leaveNoticeId: noticeId,
      sessionId,
      userId,
      joinedAt,
      leftAt,
      durationSeconds,
      leaveReason: this.leaveReason(reason),
      deleted: false,
    });
    await this.presenceRepo.save(row);
    return 'stored';
  }

  /** Latest still-open stretch that started at or before this leave. */
  private async findOpenStretch(
    sessionId: number,
    userId: number,
    leftAt: Date | null,
  ): Promise<OnlineClassPresenceEntity | null> {
    const rows = await this.presenceRepo.find({ where: { sessionId, userId, deleted: false } });
    const open = rows.filter((row) => row.leftAt == null);
    const eligible = leftAt
      ? open.filter((row) => !row.joinedAt || row.joinedAt.getTime() <= leftAt.getTime())
      : open;
    eligible.sort((a, b) => (a.joinedAt?.getTime() ?? 0) - (b.joinedAt?.getTime() ?? 0));
    return eligible.at(-1) ?? null;
  }

  private toParticipant(
    userId: number,
    stretches: OnlineClassPresenceEntity[],
    user: User | undefined,
    now: Date,
  ): OnlineClassParticipantUsage {
    let closedSeconds = 0;
    let provisionalSeconds = 0;
    for (const stretch of stretches) {
      if (stretch.leftAt != null) {
        closedSeconds += stretch.durationSeconds ?? 0;
        continue;
      }
      if (stretch.joinedAt) {
        provisionalSeconds += Math.max(
          0,
          Math.floor((now.getTime() - stretch.joinedAt.getTime()) / 1000),
        );
      }
    }
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || `User ${userId}`;
    return {
      userId,
      name,
      role: user?.role ?? UserRole.UNKNOWN,
      closedSeconds,
      provisionalSeconds,
      closedMinutes: closedSeconds / 60,
      provisionalMinutes: provisionalSeconds / 60,
      joinCount: stretches.length,
    };
  }

  private leaveReason(reason: number | undefined): number | null {
    if (reason == null || !Number.isInteger(reason)) {
      return null;
    }
    return reason;
  }
}
