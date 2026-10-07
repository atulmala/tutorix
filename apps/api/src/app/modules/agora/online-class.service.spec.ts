import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RtcTokenBuilder, RtmTokenBuilder } from 'agora-token';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../auth/enums/user-role.enum';
import { ClassSessionDeliveryModeEnum } from '../tutor-class-session/enums/class-session-delivery-mode.enum';
import { ClassSessionEnrollmentStatusEnum } from '../tutor-class-session/enums/class-session-enrollment-status.enum';
import { ClassSessionStatusEnum } from '../tutor-class-session/enums/class-session-status.enum';
import { TutorClassSessionEntity } from '../tutor-class-session/entities/tutor-class-session.entity';
import { AgoraRestClient, setAgoraFetchForTests } from './agora-rest.client';
import { AgoraTokenService } from './agora-token.service';
import { OnlineClassService } from './online-class.service';
import { onlineClassWindow } from '@tutorix/shared-utils';

jest.mock('agora-token', () => ({
  RtcRole: { PUBLISHER: 1 },
  RtcTokenBuilder: { buildTokenWithUid: jest.fn(() => 'rtc-token') },
  RtmTokenBuilder: { buildToken: jest.fn(() => 'rtm-token') },
}));

/** 3:00 pm IST. */
const START = new Date('2026-10-04T09:30:00.000Z');
const AT_255 = new Date('2026-10-04T09:25:00.000Z');
const AT_254 = new Date('2026-10-04T09:24:00.000Z');
const AT_404 = new Date('2026-10-04T10:34:00.000Z');
const AT_405 = new Date('2026-10-04T10:35:00.000Z');

const rtcConfig = {
  appId: 'app-id',
  appCertificate: 'cert',
  customerKey: 'customer-key',
  customerSecret: 'customer-secret',
  whiteboardAppIdentifier: 'board-app',
  whiteboardAk: 'ak',
  whiteboardSk: 'sk',
  whiteboardRegion: 'us-sv',
  rtcWebhookSecret: '',
};

function session(overrides: Partial<TutorClassSessionEntity> = {}): TutorClassSessionEntity {
  return {
    id: 9,
    deleted: false,
    status: ClassSessionStatusEnum.open,
    deliveryMode: ClassSessionDeliveryModeEnum.online,
    whiteboardRoomUuid: 'room-1',
    tutorCalendar: { startsAt: START, durationMinutes: 60 },
    tutorOffering: { tutor: { userId: 4 } },
    enrollments: [
      {
        deleted: false,
        status: ClassSessionEnrollmentStatusEnum.confirmed,
        studentId: 21,
      },
    ],
    ...overrides,
  } as TutorClassSessionEntity;
}

describe('onlineClassWindow', () => {
  it('marks 2:55, 3:55, 4:00, and 4:05 for a 60-minute 3:00 pm class', () => {
    const window = onlineClassWindow(START, 60);
    expect(window.opensAt.toISOString()).toBe('2026-10-04T09:25:00.000Z');
    expect(window.warnAt.toISOString()).toBe('2026-10-04T10:25:00.000Z');
    expect(window.scheduledEnd.toISOString()).toBe('2026-10-04T10:30:00.000Z');
    expect(window.hardEnd.toISOString()).toBe('2026-10-04T10:35:00.000Z');
  });
});

describe('OnlineClassService', () => {
  const sessionRepo = { findOne: jest.fn(), save: jest.fn(async (row: unknown) => row) };
  const studentRepo = { find: jest.fn() };
  const studentService = { findByUserId: jest.fn() };
  const tokens = new AgoraTokenService(rtcConfig);
  const rest = {
    kickUnauthorized: jest.fn().mockResolvedValue(undefined),
    kickChannel: jest.fn().mockResolvedValue(undefined),
  };
  const whiteboard = {
    configured: jest.fn().mockReturnValue(true),
    ensureRoom: jest.fn().mockResolvedValue('room-1'),
    buildRoomToken: jest.fn().mockReturnValue('room-token'),
  };

  const service = new OnlineClassService(
    sessionRepo as never,
    studentRepo as never,
    studentService as never,
    tokens,
    rest as never,
    whiteboard as never,
  );

  const student = { id: 8, role: UserRole.STUDENT } as User;
  const tutor = { id: 4, role: UserRole.TUTOR } as User;

  beforeEach(() => {
    jest.clearAllMocks();
    sessionRepo.findOne.mockResolvedValue(session());
    studentRepo.find.mockResolvedValue([{ id: 21, userId: 8 }]);
    studentService.findByUserId.mockResolvedValue({ id: 21 });
    whiteboard.configured.mockReturnValue(true);
    rest.kickUnauthorized.mockResolvedValue(undefined);
  });

  it('lets an enrolled student join at 2:55 pm with a token that lasts until 4:05 pm', async () => {
    const result = await service.join(student, '9', AT_255);

    expect(result.token).toBe('rtc-token');
    expect(result.rtmToken).toBe('rtm-token');
    expect(result.channelName).toBe('class-9');
    expect(result.uid).toBe(8);
    expect(result.expiresAt.toISOString()).toBe(onlineClassWindow(START, 60).hardEnd.toISOString());
    expect(result.warnAt.toISOString()).toBe('2026-10-04T10:25:00.000Z');
    expect(result.whiteboardRoomToken).toBe('room-token');
    expect(whiteboard.buildRoomToken).toHaveBeenCalledWith('room-1', 'writer', result.expiresAt, AT_255);
    expect(RtcTokenBuilder.buildTokenWithUid).toHaveBeenCalledWith(
      'app-id',
      'cert',
      'class-9',
      8,
      1,
      70 * 60,
      70 * 60,
    );
    expect(RtmTokenBuilder.buildToken).toHaveBeenCalledWith('app-id', 'cert', '8', 70 * 60);
    expect(rest.kickUnauthorized).toHaveBeenCalledWith('class-9', [4, 8]);
  });

  it('lets the student join during the extension at 4:04 pm', async () => {
    const result = await service.join(student, 9, AT_404);
    expect(result.expiresAt.toISOString()).toBe('2026-10-04T10:35:00.000Z');
  });

  it('rejects a join at 2:54 pm and at 4:05 pm', async () => {
    await expect(service.join(student, 9, AT_254)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.join(student, 9, AT_405)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an offline class', async () => {
    sessionRepo.findOne.mockResolvedValue(
      session({ deliveryMode: ClassSessionDeliveryModeEnum.offline }),
    );
    await expect(service.join(student, 9, AT_255)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects another student and a missing student profile', async () => {
    studentService.findByUserId.mockResolvedValue({ id: 99 });
    await expect(service.join(student, 9, AT_255)).rejects.toBeInstanceOf(ForbiddenException);

    studentService.findByUserId.mockResolvedValue(null);
    await expect(service.join(student, 9, AT_255)).rejects.toThrow('Student profile not found');
  });

  it('lets the tutor of the session join as the whiteboard admin', async () => {
    const result = await service.join(tutor, 9, AT_255);
    expect(result.uid).toBe(4);
    expect(whiteboard.buildRoomToken).toHaveBeenCalledWith('room-1', 'admin', result.expiresAt, AT_255);
  });

  it('still returns a token when channel management fails', async () => {
    rest.kickUnauthorized.mockRejectedValue(new Error('agora down'));
    const result = await service.join(student, 9, AT_255);
    expect(result.token).toBe('rtc-token');
  });

  it('lets the session tutor end the class and keeps it closed', async () => {
    const row = session();
    sessionRepo.findOne.mockResolvedValue(row);

    await expect(service.end(tutor, '9', AT_255)).resolves.toBe(true);

    expect(row.endedAt).toEqual(AT_255);
    expect(sessionRepo.save).toHaveBeenCalledWith(row);
    expect(rest.kickChannel).toHaveBeenCalledWith('class-9', 70);
  });

  it('rejects a student and still reports success when the channel kick fails', async () => {
    await expect(service.end(student, 9, AT_255)).rejects.toBeInstanceOf(ForbiddenException);

    rest.kickChannel.mockRejectedValue(new Error('agora down'));
    await expect(service.end(tutor, 9, AT_255)).resolves.toBe(true);
  });

  it('rejects a join after the tutor has ended the class', async () => {
    sessionRepo.findOne.mockResolvedValue(session({ endedAt: AT_255 }));
    await expect(service.join(student, 9, AT_404)).rejects.toThrow('This class has ended');
  });

  it('returns video credentials when the whiteboard cannot be created', async () => {
    whiteboard.ensureRoom.mockRejectedValue(new Error('Whiteboard room creation failed (500)'));
    const result = await service.join(student, 9, AT_255);
    expect(result.token).toBe('rtc-token');
    expect(result.whiteboardError).toBe('Whiteboard room creation failed (500)');
    expect(result.whiteboardRoomToken).toBeNull();
  });
});

describe('AgoraRestClient', () => {
  it('kicks users who are not allowed and ignores a failed kick', async () => {
    const fetchMock = jest.fn(async (url: string, _init?: RequestInit) => {
      if (String(url).includes('/channel/user/')) {
        return {
          ok: true,
          json: async () => ({ data: { users: [4, 99] } }),
        };
      }
      return { ok: false, status: 500, json: async () => ({}) };
    });
    setAgoraFetchForTests(fetchMock as never);
    const client = new AgoraRestClient(rtcConfig);

    await expect(client.kickUnauthorized('class-9', [4])).resolves.toBeUndefined();

    const kickCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes('kicking-rule'),
    ) as [string, RequestInit] | undefined;
    expect(kickCall).toBeTruthy();
    if (!kickCall) {
      throw new Error('expected a kicking-rule request');
    }
    const init = kickCall[1];
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Basic ${Buffer.from('customer-key:customer-secret').toString('base64')}`,
    );
    expect(JSON.parse(String(init.body))).toMatchObject({ cname: 'class-9', uid: 99 });
  });

  it('does not throw when the channel query is not successful', async () => {
    setAgoraFetchForTests(async () => ({ ok: false, status: 503, json: async () => ({}) }) as never);
    const client = new AgoraRestClient(rtcConfig);
    await expect(client.kickUnauthorized('class-9', [4])).resolves.toBeUndefined();
  });

  it('kicks the whole channel when a class ends', async () => {
    const fetchMock = jest.fn(async (_url: string, init?: RequestInit) => {
      void init;
      return { ok: true, status: 200, json: async () => ({}) };
    });
    setAgoraFetchForTests(fetchMock as never);
    const client = new AgoraRestClient(rtcConfig);

    await client.kickChannel('class-9', 70);

    const init = fetchMock.mock.calls[0][1];
    if (!init) {
      throw new Error('expected a kick-channel request');
    }
    expect(JSON.parse(String(init.body))).toEqual({
      appid: 'app-id',
      cname: 'class-9',
      time: 70,
      privileges: ['join_channel'],
    });
  });
});
