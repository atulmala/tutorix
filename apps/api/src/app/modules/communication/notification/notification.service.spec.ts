import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationService],
    }).compile();
    service = module.get(NotificationService);
  });

  it('returns a no-op result until FCM is wired', async () => {
    const result = await service.send({
      userId: 9,
      title: 'Class reminder',
      body: 'Your class starts in 15 minutes',
    });
    expect(result).toEqual({ success: false, messageId: null });
  });
});
