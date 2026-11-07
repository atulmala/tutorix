import { ConfigService } from '@nestjs/config';
import { RazorpayXPayoutGateway } from './razorpayx-payout.gateway';

describe('RazorpayXPayoutGateway', () => {
  it('is disabled unless TUTOR_PAYOUT_RAZORPAYX_ENABLED is true', () => {
    const config = {
      get: (key: string) =>
        key === 'TUTOR_PAYOUT_RAZORPAYX_ENABLED' ? 'false' : undefined,
    } as ConfigService;
    const gateway = new RazorpayXPayoutGateway(config, {} as never);
    expect(gateway.isEnabled()).toBe(false);
  });

  it('is enabled when flag is true', () => {
    const config = {
      get: (key: string) =>
        key === 'TUTOR_PAYOUT_RAZORPAYX_ENABLED' ? 'true' : undefined,
    } as ConfigService;
    const gateway = new RazorpayXPayoutGateway(config, {} as never);
    expect(gateway.isEnabled()).toBe(true);
  });
});
