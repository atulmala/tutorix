import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { DeviceTokenService } from './device-token.service';

const sendEachForMulticast = jest.fn();

jest.mock('firebase-admin', () => ({
  apps: [{ name: '[DEFAULT]' }],
  app: jest.fn(() => ({ name: '[DEFAULT]' })),
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  credential: { cert: jest.fn(() => ({})) },
  messaging: jest.fn(() => ({ sendEachForMulticast })),
}));

describe('NotificationService', () => {
  let service: NotificationService;
  let deviceTokenService: { tokensForUser: jest.Mock; deleteTokens: jest.Mock };

  beforeEach(async () => {
    sendEachForMulticast.mockReset();
    deviceTokenService = {
      tokensForUser: jest.fn().mockResolvedValue([]),
      deleteTokens: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'NOTIFICATION_PROVIDER' ? 'console' : undefined,
          },
        },
        { provide: DeviceTokenService, useValue: deviceTokenService },
      ],
    }).compile();
    service = module.get(NotificationService);
  });

  it('logs via the console provider when FCM is not configured', async () => {
    const result = await service.send({
      userId: 9,
      title: 'Class reminder',
      body: 'Your class starts in 15 minutes',
    });
    expect(service.getProviderKind()).toBe('console');
    expect(result).toEqual({ success: true, messageId: null });
  });

  it('prunes invalid FCM tokens after sendEachForMulticast', async () => {
    const fcmTokens = {
      tokensForUser: jest
        .fn()
        .mockResolvedValue([{ id: 1, token: 'stale-token' }]),
      deleteTokens: jest.fn(),
    };
    sendEachForMulticast.mockResolvedValue({
      successCount: 0,
      failureCount: 1,
      responses: [
        {
          success: false,
          error: { code: 'messaging/registration-token-not-registered' },
        },
      ],
    });
    const fcmService = new NotificationService(
      {
        get: (key: string) => {
          if (key === 'NOTIFICATION_PROVIDER') return 'fcm';
          if (key === 'FIREBASE_SERVICE_ACCOUNT_JSON') {
            return '{"project_id":"demo","client_email":"a@b.c","private_key":"x"}';
          }
          return undefined;
        },
      } as unknown as ConfigService,
      fcmTokens as never,
    );

    await fcmService.send({
      userId: 9,
      title: 'Hi',
      body: 'There',
    });
    expect(sendEachForMulticast).toHaveBeenCalled();
    expect(fcmTokens.deleteTokens).toHaveBeenCalledWith(['stale-token']);
  });
});
