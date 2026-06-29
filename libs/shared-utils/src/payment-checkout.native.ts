import type { ConfirmPaymentInput, PaymentOrderSession } from './payment-checkout-core';

export * from './payment-checkout-core';

/**
 * PHASE 1 BASELINE: mobile payments are intentionally disabled.
 *
 * The native Razorpay integration was reverted because live-key testing on
 * device moved real money. Until the integration is re-introduced and hardened
 * (see docs/plans razorpay mobile integration, phases 2-4), this never touches
 * `react-native-razorpay` and cannot start a charge. Callers should direct the
 * user to complete payment on the web.
 */
const MOBILE_PAYMENT_DISABLED_MESSAGE =
  'This payment is temporarily available on the web only. Please complete it on the Tutorix website.';

export async function openPaymentCheckout(
  session: PaymentOrderSession,
): Promise<ConfirmPaymentInput> {
  void session;
  throw new Error(MOBILE_PAYMENT_DISABLED_MESSAGE);
}

export function loadRazorpayScript(): Promise<void> {
  return Promise.resolve();
}

export function loadCashfreeScript(): Promise<void> {
  return Promise.resolve();
}
