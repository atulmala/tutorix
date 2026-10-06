import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { roomToken, sdkToken, TokenRole } from 'netless-token';
import { IsNull, Repository } from 'typeorm';
import { TutorClassSessionEntity } from '../tutor-class-session/entities/tutor-class-session.entity';
import { AgoraConfig, readAgoraConfig } from './agora.config';

export type WhiteboardJoinRole = 'admin' | 'writer';

type FetchLike = typeof fetch;

let whiteboardFetch: FetchLike = fetch;

/** Tests replace the whiteboard HTTP client without going through Nest. */
export function setWhiteboardFetchForTests(next: FetchLike): void {
  whiteboardFetch = next;
}

@Injectable()
export class AgoraWhiteboardService {
  constructor(
    @InjectRepository(TutorClassSessionEntity)
    private readonly sessionRepo: Repository<TutorClassSessionEntity>,
    private readonly config: AgoraConfig = readAgoraConfig(),
  ) {}

  configured(): boolean {
    return Boolean(
      this.config.whiteboardAppIdentifier &&
        this.config.whiteboardAk &&
        this.config.whiteboardSk &&
        this.config.whiteboardRegion,
    );
  }

  async ensureRoom(session: TutorClassSessionEntity, expireAt: Date, now = new Date()): Promise<string> {
    if (session.whiteboardRoomUuid) {
      return session.whiteboardRoomUuid;
    }
    const created = await this.createRoom(expireAt, now);
    const saved = await this.sessionRepo.update(
      { id: session.id, whiteboardRoomUuid: IsNull() },
      { whiteboardRoomUuid: created },
    );
    if (!saved.affected) {
      const fresh = await this.sessionRepo.findOne({ where: { id: session.id } });
      if (fresh?.whiteboardRoomUuid) {
        return fresh.whiteboardRoomUuid;
      }
    }
    return created;
  }

  buildRoomToken(
    uuid: string,
    role: WhiteboardJoinRole,
    expireAt: Date,
    now = new Date(),
  ): string {
    return roomToken(this.config.whiteboardAk, this.config.whiteboardSk, lifespanMs(expireAt, now), {
      role: role === 'admin' ? TokenRole.Admin : TokenRole.Writer,
      uuid,
    });
  }

  private async createRoom(expireAt: Date, now: Date): Promise<string> {
    const token = sdkToken(this.config.whiteboardAk, this.config.whiteboardSk, lifespanMs(expireAt, now), {
      role: TokenRole.Admin,
    });
    const response = await whiteboardFetch('https://api.netless.link/v5/rooms', {
      method: 'POST',
      headers: {
        token,
        region: this.config.whiteboardRegion,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isRecord: false }),
    });
    if (!response.ok) {
      throw new Error(`Whiteboard room creation failed (${response.status})`);
    }
    const body = (await response.json()) as { uuid?: string };
    if (!body.uuid) {
      throw new Error('Whiteboard room creation did not return a room id');
    }
    return body.uuid;
  }
}

function lifespanMs(expireAt: Date, now: Date): number {
  return Math.max(1000, expireAt.getTime() - now.getTime());
}
