import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../auth/enums/user-role.enum';
import { AgoraRtcWebhookController } from './agora-rtc-webhook.controller';
import { agoraRtcWebhookSignature } from './agora-rtc-webhook.util';
import { OnlineClassPresenceEntity } from './entities/online-class-presence.entity';
import { OnlineClassPresenceService } from './online-class-presence.service';

class MemoryPresenceRepo {
  rows: OnlineClassPresenceEntity[] = [];
  private nextId = 1;

  create(partial: Partial<OnlineClassPresenceEntity>): OnlineClassPresenceEntity {
    return Object.assign(new OnlineClassPresenceEntity(), partial);
  }

  async save(row: OnlineClassPresenceEntity): Promise<OnlineClassPresenceEntity> {
    if (!row.id) {
      row.id = this.nextId++;
      this.rows.push(row);
    }
    return row;
  }

  async findOne(options: {
    where: Partial<OnlineClassPresenceEntity>;
  }): Promise<OnlineClassPresenceEntity | null> {
    return this.rows.find((row) => matches(row, options.where)) ?? null;
  }

  async find(options: {
    where: Partial<OnlineClassPresenceEntity>;
  }): Promise<OnlineClassPresenceEntity[]> {
    return this.rows.filter((row) => matches(row, options.where));
  }
}

class MemoryUserRepo {
  constructor(private readonly users: Partial<User>[]) {}

  async find(): Promise<Partial<User>[]> {
    return this.users;
  }
}

function matches(
  row: OnlineClassPresenceEntity,
  where: Partial<OnlineClassPresenceEntity>,
): boolean {
  return Object.entries(where).every(([key, value]) => row[key as keyof OnlineClassPresenceEntity] === value);
}

function serviceWith(users: Partial<User>[] = []): {
  service: OnlineClassPresenceService;
  repo: MemoryPresenceRepo;
} {
  const repo = new MemoryPresenceRepo();
  const service = new OnlineClassPresenceService(
    repo as unknown as Repository<OnlineClassPresenceEntity>,
    new MemoryUserRepo(users) as unknown as Repository<User>,
  );
  return { service, repo };
}

describe('OnlineClassPresenceService', () => {
  it('stores one stretch and uses Agora duration for a join then leave', async () => {
    const { service, repo } = serviceWith([
      { id: 7, firstName: 'Ruchi', lastName: 'Sharma', role: UserRole.STUDENT },
    ]);

    await service.ingest({
      noticeId: 'join-1',
      eventType: 107,
      payload: { channelName: 'class-9', uid: 7, ts: 1_000 },
    });
    const whileConnected = await service.usage(9, new Date(1_100_000));
    expect(whileConnected.participants[0].provisionalSeconds).toBe(100);
    expect(whileConnected.participants[0].closedSeconds).toBe(0);

    await service.ingest({
      noticeId: 'leave-1',
      eventType: 108,
      payload: { channelName: 'class-9', uid: 7, ts: 1_600, duration: 500, reason: 1 },
    });

    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0].durationSeconds).toBe(500);
    expect(repo.rows[0].leaveReason).toBe(1);

    const usage = await service.usage(9, new Date(2_000_000));
    expect(usage.closedSeconds).toBe(500);
    expect(usage.closedMinutes).toBe(500 / 60);
    expect(usage.participants).toEqual([
      expect.objectContaining({
        userId: 7,
        name: 'Ruchi Sharma',
        role: UserRole.STUDENT,
        closedSeconds: 500,
        provisionalSeconds: 0,
        closedMinutes: 500 / 60,
        joinCount: 1,
      }),
    ]);
  });

  it('excludes the gap when a participant drops and rejoins', async () => {
    const { service, repo } = serviceWith();

    await service.ingest({
      noticeId: 'join-1',
      eventType: 107,
      payload: { channelName: 'class-9', uid: 4, ts: 1_000 },
    });
    await service.ingest({
      noticeId: 'leave-1',
      eventType: 108,
      payload: { channelName: 'class-9', uid: 4, ts: 1_600, duration: 500, reason: 2 },
    });
    await service.ingest({
      noticeId: 'join-2',
      eventType: 107,
      payload: { channelName: 'class-9', uid: 4, ts: 2_000 },
    });
    await service.ingest({
      noticeId: 'leave-2',
      eventType: 108,
      payload: { channelName: 'class-9', uid: 4, ts: 2_300, duration: 200, reason: 1 },
    });

    expect(repo.rows).toHaveLength(2);
    const usage = await service.usage(9);
    expect(usage.closedSeconds).toBe(700);
    expect(usage.participants[0].joinCount).toBe(2);
    expect(usage.participants[0].provisionalSeconds).toBe(0);
  });

  it('does not add time when the same notice is delivered again', async () => {
    const { service, repo } = serviceWith();
    const leave = {
      noticeId: 'leave-1',
      eventType: 108,
      payload: { channelName: 'class-9', uid: 4, ts: 1_600, duration: 500, reason: 1 },
    };

    await service.ingest({
      noticeId: 'join-1',
      eventType: 107,
      payload: { channelName: 'class-9', uid: 4, ts: 1_000 },
    });
    expect(await service.ingest(leave)).toBe('stored');
    expect(await service.ingest(leave)).toBe('duplicate');
    expect(await service.ingest({
      noticeId: 'join-1',
      eventType: 107,
      payload: { channelName: 'class-9', uid: 4, ts: 1_000 },
    })).toBe('duplicate');

    expect(repo.rows).toHaveLength(1);
    expect((await service.usage(9)).closedSeconds).toBe(500);
  });

  it('ignores a channel that is not class-{id}', async () => {
    const { service, repo } = serviceWith();
    const result = await service.ingest({
      noticeId: 'join-other',
      eventType: 107,
      payload: { channelName: 'lobby', uid: 4, ts: 1_000 },
    });
    expect(result).toBe('ignored');
    expect(repo.rows).toHaveLength(0);
  });
});

describe('AgoraRtcWebhookController', () => {
  const secret = 'rtc-webhook-secret';
  const previous = process.env.AGORA_RTC_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.AGORA_RTC_WEBHOOK_SECRET = secret;
  });

  afterEach(() => {
    process.env.AGORA_RTC_WEBHOOK_SECRET = previous;
  });

  it('rejects a bad signature', async () => {
    const ingest = jest.fn();
    const controller = new AgoraRtcWebhookController({ ingest } as unknown as OnlineClassPresenceService);
    const rawBody = Buffer.from('{"noticeId":"n1"}');

    await expect(
      controller.handleAgoraRtcWebhook({ body: rawBody } as never, 'not-the-signature', undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(ingest).not.toHaveBeenCalled();
  });

  it('accepts a signature over the raw body', async () => {
    const ingest = jest.fn().mockResolvedValue('stored');
    const controller = new AgoraRtcWebhookController({ ingest } as unknown as OnlineClassPresenceService);
    const rawBody = Buffer.from(
      JSON.stringify({
        noticeId: 'join-1',
        eventType: 107,
        payload: { channelName: 'class-9', uid: 4, ts: 1_000 },
      }),
    );

    const result = await controller.handleAgoraRtcWebhook(
      { body: rawBody } as never,
      agoraRtcWebhookSignature(rawBody, secret),
      undefined,
    );

    expect(result).toEqual({ received: true });
    expect(ingest).toHaveBeenCalledWith(expect.objectContaining({ noticeId: 'join-1', eventType: 107 }));
  });
});
