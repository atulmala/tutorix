import { ConfigService } from '@nestjs/config';
import { RazorpayGateway } from './payment-gateways';

describe('RazorpayGateway', () => {
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'RAZORPAY_KEY_ID') return 'rzp_test_key';
      if (key === 'RAZORPAY_KEY_SECRET') return 'rzp_test_secret';
      if (key === 'RAZORPAY_CHECKOUT_THEME_COLOR') return '#5fa8ff';
      return undefined;
    }),
  } as unknown as ConfigService;

  let gateway: RazorpayGateway;

  beforeEach(() => {
    gateway = new RazorpayGateway(configService);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'order_test123', amount: 15000 }),
    }) as jest.Mock;
  });

  it('sends checkout purpose on order create and checkout payload', async () => {
    const session = await gateway.createOrder({
      amountInr: 150,
      receipt: 'TX260624TEST',
      notes: {
        feeCode: 'TUTOR_REGISTRATION',
        description: 'Tutor registration fee',
      },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.razorpay.com/v1/orders',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"description":"Tutor Registration Fee"'),
      }),
    );

    const requestBody = JSON.parse(
      (global.fetch as jest.Mock).mock.calls[0][1].body as string,
    );
    expect(requestBody.notes.purpose).toBe('Tutor Registration Fee');
    expect(requestBody.line_items).toEqual([
      expect.objectContaining({
        sku: 'TUTOR_REGISTRATION',
        name: 'Tutor Registration Fee',
        offer_price: 15000,
      }),
    ]);
    expect(requestBody.line_items_total).toBe(15000);
    expect(session.checkoutPayload.name).toBe('Tutor Registration Fee');
    expect(session.checkoutPayload.description).toBe('Tutor Registration Fee');
    expect(session.checkoutPayload.image).toBe('https://www.tutorix.com/favicon.ico');
    expect(session.checkoutPayload.amount).toBe(15000);
    expect(session.checkoutPayload.notes).toEqual({
      purpose: 'Tutor Registration Fee',
    });
  });
});
