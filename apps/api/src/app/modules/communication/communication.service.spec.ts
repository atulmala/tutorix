import { CommunicationService } from './communication.service';
import { CommunicationAudience } from './enums/communication-audience.enum';
import { CommunicationEvent } from './enums/communication-event.enum';

describe('CommunicationService', () => {
  it('treats a missing Mobile verification rule as not required', async () => {
    const service = new CommunicationService(
      {} as never,
      {} as never,
      { findOne: jest.fn().mockResolvedValue(null) } as never,
    );

    await expect(service.isMobileVerificationRequired()).resolves.toBe(false);
  });

  it('returns true when the Mobile verification rule is enabled', async () => {
    const findOne = jest.fn().mockResolvedValue({ enabled: true });
    const service = new CommunicationService(
      {} as never,
      {} as never,
      { findOne } as never,
    );

    await expect(service.isMobileVerificationRequired()).resolves.toBe(true);
    expect(findOne).toHaveBeenCalledWith({
      where: {
        event: CommunicationEvent.MOBILE_VERIFICATION,
        audience: CommunicationAudience.ACTOR,
        deleted: false,
      },
    });
  });
});
