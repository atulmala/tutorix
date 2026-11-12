import {
  assertMobileCashfreeEnvironmentAllowed,
  CASHFREE_DEV_PRODUCTION_BLOCKED_MESSAGE,
  parseCashfreeSession,
} from './cashfree-checkout';

jest.mock('@tutorix/shared-graphql/client/mobile/apollo-client', () => ({
  getMobileGraphQLEndpoint: () => 'http://localhost/graphql',
}));
jest.mock('@tutorix/shared-graphql/client/mobile/token-storage', () => ({
  getAuthToken: async () => null,
}));

describe('cashfree-checkout', () => {
  it('parses the checkout payload from the API session', () => {
    expect(
      parseCashfreeSession({
        skipped: false,
        provider: 'cashfree',
        orderId: 'ord_1',
        checkoutPayloadJson: JSON.stringify({
          paymentSessionId: 'session_1',
          orderId: 'ord_1',
          environment: 'production',
        }),
      }),
    ).toEqual({ paymentSessionId: 'session_1', orderId: 'ord_1', environment: 'production' });
  });

  it('defaults to sandbox and rejects incomplete sessions', () => {
    expect(
      parseCashfreeSession({
        skipped: false,
        provider: 'cashfree',
        orderId: 'ord_2',
        checkoutPayloadJson: JSON.stringify({ paymentSessionId: 's' }),
      }).environment,
    ).toBe('sandbox');
    expect(() =>
      parseCashfreeSession({ skipped: false, provider: 'cashfree', checkoutPayloadJson: '{}' }),
    ).toThrow(/incomplete/);
  });

  it('blocks live Cashfree sessions in dev builds only', () => {
    expect(() => assertMobileCashfreeEnvironmentAllowed('production', true)).toThrow(
      CASHFREE_DEV_PRODUCTION_BLOCKED_MESSAGE,
    );
    expect(() => assertMobileCashfreeEnvironmentAllowed('production', false)).not.toThrow();
    expect(() => assertMobileCashfreeEnvironmentAllowed('sandbox', true)).not.toThrow();
  });
});
