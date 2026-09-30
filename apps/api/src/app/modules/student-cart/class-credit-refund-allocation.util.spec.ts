import { allocateGatewayRefund } from './class-credit-refund-allocation.util';

describe('allocateGatewayRefund', () => {
  it('uses one payment when it still covers the amount', () => {
    expect(
      allocateGatewayRefund(500, [
        {
          paymentAttemptId: 2,
          gatewayPaymentId: 'pay_new',
          amountInr: 2000,
          refundedInr: 0,
        },
      ]),
    ).toEqual([
      { paymentAttemptId: 2, gatewayPaymentId: 'pay_new', amountInr: 500 },
    ]);
  });

  it('splits across payments and skips amount already refunded', () => {
    expect(
      allocateGatewayRefund(800, [
        {
          paymentAttemptId: 2,
          gatewayPaymentId: 'pay_new',
          amountInr: 500,
          refundedInr: 200,
        },
        {
          paymentAttemptId: 1,
          gatewayPaymentId: 'pay_old',
          amountInr: 1000,
          refundedInr: 0,
        },
      ]),
    ).toEqual([
      { paymentAttemptId: 2, gatewayPaymentId: 'pay_new', amountInr: 300 },
      { paymentAttemptId: 1, gatewayPaymentId: 'pay_old', amountInr: 500 },
    ]);
  });

  it('returns no slices when the captured payments cannot cover the amount', () => {
    expect(
      allocateGatewayRefund(900, [
        {
          paymentAttemptId: 1,
          gatewayPaymentId: 'pay_old',
          amountInr: 500,
          refundedInr: 0,
        },
      ]),
    ).toEqual([]);
  });
});
