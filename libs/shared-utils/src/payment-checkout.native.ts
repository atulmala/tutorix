import type { ConfirmPaymentInput, PaymentOrderSession } from './payment-checkout';

type RazorpayNativeModule = {
  open: (options: Record<string, unknown>) => Promise<{
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }>;
};

export async function openPaymentCheckout(
  session: PaymentOrderSession,
): Promise<ConfirmPaymentInput> {
  if (session.skipped || !session.provider || !session.checkoutPayloadJson) {
    throw new Error('No checkout session to open');
  }

  const payload = JSON.parse(session.checkoutPayloadJson) as Record<string, unknown>;

  if (session.provider === 'razorpay') {
    const RazorpayCheckout = require('react-native-razorpay')
      .default as RazorpayNativeModule;
    const result = await RazorpayCheckout.open({
      ...payload,
      currency: payload.currency ?? 'INR',
    });
    return {
      provider: 'razorpay',
      orderId: result.razorpay_order_id,
      paymentId: result.razorpay_payment_id,
      signature: result.razorpay_signature,
    };
  }

  throw new Error(
    `Mobile checkout for ${session.provider} is not supported yet. Use Razorpay or complete payment on web.`,
  );
}

export function loadRazorpayScript(): Promise<void> {
  return Promise.resolve();
}

export function loadCashfreeScript(): Promise<void> {
  return Promise.resolve();
}

export {
  formatPlatformFeeSummary,
  type ConfirmPaymentInput,
  type PaymentGatewayProvider,
  type PaymentOrderSession,
} from './payment-checkout';
