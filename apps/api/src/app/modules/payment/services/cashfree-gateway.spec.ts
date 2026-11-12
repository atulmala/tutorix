import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import {
  buildCashfreeOrderId,
  buildCashfreeRefundId,
  CashfreeGateway,
  isCashfreeRefundId,
  normalizeCashfreeRefundStatus,
  SIMULATED_GATEWAY_REFUND_PREFIX,
} from './payment-gateways';

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

describe('CashfreeGateway', () => {
  const config: Record<string, string | undefined> = {
    CASHFREE_APP_ID: 'cf_app',
    CASHFREE_SECRET_KEY: 'cf_secret',
    CASHFREE_ENV: 'sandbox',
    API_PUBLIC_BASE_URL: 'https://api.example.com/',
  };
  const configService = {
    get: jest.fn((key: string) => config[key]),
  } as unknown as ConfigService;

  let gateway: CashfreeGateway;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    gateway = new CashfreeGateway(configService);
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('creates a unique, Cashfree-safe order with webhook notify url', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ order_id: 'TX-1_abc', payment_session_id: 'session_1', order_amount: 150 }),
    );

    const session = await gateway.createOrder({
      amountInr: 150,
      receipt: 'TX/260624 TEST',
      notes: { description: 'Tutor registration fee', feeCode: 'TUTOR_REGISTRATION' },
      customer: { id: '42', phone: '+91 98765 43210', email: 'a@b.com', name: 'A B' },
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://sandbox.cashfree.com/pg/orders');
    expect(init.headers['x-api-version']).toBe('2023-08-01');
    const body = JSON.parse(init.body as string);
    expect(body.order_id).toMatch(/^TX260624TEST_[a-z0-9]+$/);
    expect(body.order_id.length).toBeLessThanOrEqual(45);
    expect(body.customer_details).toEqual(
      expect.objectContaining({ customer_id: 'u_42', customer_phone: '9876543210' }),
    );
    expect(body.order_meta.notify_url).toBe('https://api.example.com/api/webhooks/cashfree');
    expect(body.order_tags.feeCode).toBe('TUTOR_REGISTRATION');
    expect(session.checkoutPayload).toEqual({
      paymentSessionId: 'session_1',
      orderId: 'TX-1_abc',
      orderAmount: 150,
      environment: 'sandbox',
    });
  });

  it('rejects order creation without a 10-digit mobile number', async () => {
    await expect(
      gateway.createOrder({ amountInr: 100, receipt: 'r1', customer: { id: '1' } }),
    ).rejects.toThrow(/mobile number/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('verifies only orders that are PAID with a SUCCESS payment', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ order_status: 'PAID', order_amount: 150 }))
      .mockResolvedValueOnce(
        jsonResponse([
          { cf_payment_id: 111, payment_status: 'FAILED', payment_amount: 150 },
          { cf_payment_id: 222, payment_status: 'SUCCESS', payment_amount: 150 },
        ]),
      );

    await expect(gateway.fetchCapturedPaymentForOrder('ord_1')).resolves.toEqual({
      orderId: 'ord_1',
      paymentId: '222',
    });
  });

  it('treats an ACTIVE order as not captured', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ order_status: 'ACTIVE', order_amount: 150 }));
    await expect(
      gateway.verifyPayment({ orderId: 'ord_1', paymentId: 'ord_1', signature: 'x' }),
    ).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refunds by order id with our refund id and maps refund status', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ refund_id: 'cfr-9-3-abc', refund_status: 'PENDING' }))
      .mockResolvedValueOnce(jsonResponse({ refund_status: 'SUCCESS' }));

    await expect(
      gateway.refundPayment({ gatewayOrderId: 'ord_1', amountInr: 500, refundId: 'cfr-9-3-abc' }),
    ).resolves.toBe('cfr-9-3-abc');
    const [refundUrl, refundInit] = fetchMock.mock.calls[0];
    expect(refundUrl).toBe('https://sandbox.cashfree.com/pg/orders/ord_1/refunds');
    expect(JSON.parse(refundInit.body as string)).toEqual(
      expect.objectContaining({ refund_amount: 500, refund_id: 'cfr-9-3-abc' }),
    );

    await expect(gateway.fetchRefundStatus('ord_1', 'cfr-9-3-abc')).resolves.toBe('processed');
  });

  it('reports simulated refunds as processed without calling Cashfree', async () => {
    await expect(
      gateway.fetchRefundStatus('ord_1', `${SIMULATED_GATEWAY_REFUND_PREFIX}cfr-1`),
    ).resolves.toBe('processed');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps settlement details and returns null while unsettled', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          cf_settlement_id: 777,
          transfer_utr: 'UTR123',
          transfer_time: '2026-11-08T10:00:00+05:30',
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ message: 'not found' }, 404));

    await expect(gateway.fetchSettlementForOrder('ord_1')).resolves.toEqual({
      settlementId: '777',
      utr: 'UTR123',
      settledAt: new Date('2026-11-08T10:00:00+05:30'),
    });
    await expect(gateway.fetchSettlementForOrder('ord_2')).resolves.toBeNull();
  });

  it('verifies webhook signatures over timestamp + raw body', () => {
    const rawBody = '{"type":"PAYMENT_SUCCESS_WEBHOOK"}';
    const timestamp = '1731150000';
    const signature = createHmac('sha256', 'cf_secret')
      .update(`${timestamp}${rawBody}`)
      .digest('base64');

    expect(gateway.verifyWebhookSignature(rawBody, timestamp, signature)).toBe(true);
    expect(gateway.verifyWebhookSignature(rawBody, timestamp, 'bad')).toBe(false);
    expect(gateway.verifyWebhookSignature(`${rawBody} `, timestamp, signature)).toBe(false);
  });
});

describe('Cashfree id helpers', () => {
  it('builds bounded ids and recognises Cashfree refunds', () => {
    expect(buildCashfreeOrderId('x'.repeat(80), 0).length).toBeLessThanOrEqual(45);
    const refundId = buildCashfreeRefundId(12, 34, 0);
    expect(refundId).toBe('cfr-12-34-0');
    expect(isCashfreeRefundId(refundId)).toBe(true);
    expect(isCashfreeRefundId('rfnd_abc')).toBe(false);
  });

  it('normalises refund statuses', () => {
    expect(normalizeCashfreeRefundStatus('SUCCESS')).toBe('processed');
    expect(normalizeCashfreeRefundStatus('ONHOLD')).toBe('pending');
    expect(normalizeCashfreeRefundStatus('CANCELLED')).toBe('failed');
    expect(normalizeCashfreeRefundStatus(undefined)).toBeNull();
  });
});
