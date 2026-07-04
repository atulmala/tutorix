import RazorpayCheckout from 'react-native-razorpay';
import type { ConfirmPaymentInput, PaymentOrderSession } from './payment-checkout-core';
import type { RazorpayErrorResponse } from './razorpay-native.types';

export * from './payment-checkout-core';

/**
 * Android bring-up safety gate.
 *
 * The previous native integration was reverted after live-key testing on a
 * device moved real money. As long as this constant is enforced, mobile
 * checkout will only open against a Razorpay TEST key (`rzp_test_...`), so a
 * misconfigured live key can never charge a real instrument from the app.
 */
const TEST_KEY_PREFIX = 'rzp_test_';

const NO_SESSION_MESSAGE = 'No checkout session to open';
const UNSUPPORTED_PROVIDER_MESSAGE =
  'Payments on mobile currently support Razorpay only. Please complete this payment on the web.';
const LIVE_KEY_BLOCKED_MESSAGE =
  'Mobile payments are limited to Razorpay test mode right now. Please complete this payment on the web.';
const CANCELLED_MESSAGE = 'Payment cancelled';
const GENERIC_FAILURE_MESSAGE = 'Payment failed. Please try again.';

/**
 * These loaders only make sense on web (they inject the checkout <script>).
 * They are kept as no-ops here so shared modules can import them on native
 * without a platform check.
 */
export function loadRazorpayScript(): Promise<void> {
  return Promise.resolve();
}

export function loadCashfreeScript(): Promise<void> {
  return Promise.resolve();
}

function resolveCheckoutDescription(
  payload: Record<string, unknown>,
): string | undefined {
  if (typeof payload.description === 'string' && payload.description.trim()) {
    return payload.description.trim();
  }
  const notes = payload.notes;
  if (
    typeof notes === 'object' &&
    notes !== null &&
    typeof (notes as Record<string, unknown>).purpose === 'string'
  ) {
    const purpose = String((notes as Record<string, unknown>).purpose).trim();
    return purpose || undefined;
  }
  return undefined;
}

function describeRazorpayError(error: unknown): string {
  const err = error as RazorpayErrorResponse | Error | undefined;

  if (err instanceof Error) {
    return err.message || GENERIC_FAILURE_MESSAGE;
  }

  const description = err?.description ?? err?.error?.description;
  if (typeof description === 'string' && /cancel/i.test(description)) {
    return CANCELLED_MESSAGE;
  }

  return description ?? GENERIC_FAILURE_MESSAGE;
}

export async function openPaymentCheckout(
  session: PaymentOrderSession,
): Promise<ConfirmPaymentInput> {
  if (session.skipped || !session.provider || !session.checkoutPayloadJson) {
    throw new Error(NO_SESSION_MESSAGE);
  }

  if (session.provider !== 'razorpay') {
    throw new Error(UNSUPPORTED_PROVIDER_MESSAGE);
  }

  const payload = JSON.parse(session.checkoutPayloadJson) as Record<string, unknown>;

  const key = typeof payload.key === 'string' ? payload.key : '';
  if (!key.startsWith(TEST_KEY_PREFIX)) {
    throw new Error(LIVE_KEY_BLOCKED_MESSAGE);
  }

  const description = resolveCheckoutDescription(payload);

  const options: Record<string, unknown> = {
    key,
    order_id: payload.order_id,
    currency: payload.currency ?? 'INR',
    name: payload.name,
    ...(payload.amount != null ? { amount: payload.amount } : {}),
    ...(description ? { description } : {}),
    ...(payload.image ? { image: payload.image } : {}),
    ...(payload.theme ? { theme: payload.theme } : {}),
    ...(payload.prefill ? { prefill: payload.prefill } : {}),
    ...(payload.notes ? { notes: payload.notes } : {}),
  };

  const gatewayOrderId = String(payload.order_id ?? session.orderId ?? '');

  try {
    const data = await RazorpayCheckout.open(options);
    return {
      provider: 'razorpay',
      orderId: String(data.razorpay_order_id ?? gatewayOrderId),
      paymentId: String(data.razorpay_payment_id ?? ''),
      signature: String(data.razorpay_signature ?? ''),
    };
  } catch (error) {
    throw new Error(describeRazorpayError(error));
  }
}
