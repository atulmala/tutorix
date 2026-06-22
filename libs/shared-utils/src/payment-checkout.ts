export type PaymentGatewayProvider = 'razorpay' | 'cashfree';

export type PaymentOrderSession = {
  skipped: boolean;
  provider?: PaymentGatewayProvider;
  orderId?: string;
  amountInr?: number;
  currency?: string;
  checkoutPayloadJson?: string | null;
};

export type CommerceOrderSummary = {
  id: number;
  orderNumber: string;
  status: string;
  amountDueInr: number;
  amountPaidInr?: number;
  paymentMethod?: string | null;
  paidAt?: string | null;
};

export type CheckoutResult = {
  order: CommerceOrderSummary;
  session?: PaymentOrderSession | null;
};

export function checkoutSession(result: CheckoutResult): PaymentOrderSession {
  return result.session ?? { skipped: true };
}

export type ConfirmPaymentInput = {
  provider?: PaymentGatewayProvider;
  orderId: string;
  paymentId: string;
  signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: Record<string, string>) => void) => void;
    };
    Cashfree?: (config: { mode: string }) => {
      checkout: (options: Record<string, unknown>) => Promise<{ error?: { message?: string } }>;
    };
  }
}

export function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay checkout is only available in the browser'));
  }
  if (window.Razorpay) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout script'));
    document.body.appendChild(script);
  });
}

export function loadCashfreeScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Cashfree checkout is only available in the browser'));
  }
  if (window.Cashfree) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Cashfree checkout script'));
    document.body.appendChild(script);
  });
}

export async function openPaymentCheckout(
  session: PaymentOrderSession,
): Promise<ConfirmPaymentInput> {
  if (session.skipped || !session.provider || !session.checkoutPayloadJson) {
    throw new Error('No checkout session to open');
  }

  const payload = JSON.parse(session.checkoutPayloadJson) as Record<string, unknown>;

  if (session.provider === 'razorpay') {
    await loadRazorpayScript();
    return new Promise((resolve, reject) => {
      const options = {
        ...payload,
        handler: (response: Record<string, string>) => {
          resolve({
            provider: 'razorpay',
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: () => reject(new Error('Payment cancelled')),
        },
      };
      if (!window.Razorpay) {
        throw new Error('Razorpay checkout script failed to load');
      }
      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', (response: { error?: { description?: string } }) => {
        reject(
          new Error(response.error?.description ?? 'Payment failed. Please try again.'),
        );
      });
      razorpay.open();
    });
  }

  if (session.provider === 'cashfree') {
    await loadCashfreeScript();
    if (!window.Cashfree) {
      throw new Error('Cashfree checkout script failed to load');
    }
    const environment = String(payload.environment ?? 'sandbox');
    const cashfree = window.Cashfree({ mode: environment });
    const result = await cashfree.checkout({
      paymentSessionId: payload.paymentSessionId,
      redirectTarget: '_modal',
    });
    if (result.error) {
      throw new Error(result.error.message ?? 'Cashfree payment failed');
    }
    return {
      provider: 'cashfree',
      orderId: String(payload.orderId ?? session.orderId),
      paymentId: String(payload.orderId ?? session.orderId),
      signature: String(payload.paymentSessionId ?? ''),
    };
  }

  throw new Error(`Unsupported payment provider: ${session.provider}`);
}

export function buildWaivedFeeMessage(feeLabel: string, amountInr: number): string {
  return `The regular ${feeLabel.toLowerCase()} is ₹${amountInr}, but it is waived for a limited time.`;
}

export function formatPlatformFeeSummary(fee: {
  displayName?: string;
  amountInr: number;
  discountAmountInr: number;
  effectiveAmountInr: number;
  waived: boolean;
  displayLabel: string;
  promoMessage?: string | null;
}): { title: string; message?: string; requiresPayment: boolean } {
  const feeName = fee.displayName ?? 'registration fee';
  const title =
    fee.effectiveAmountInr <= 0
      ? `${feeName} (Free)`
      : `${feeName} — ₹${fee.effectiveAmountInr}`;

  let message: string | undefined;
  if (fee.effectiveAmountInr <= 0) {
    message = buildWaivedFeeMessage(feeName, fee.amountInr);
  } else if (fee.promoMessage?.trim()) {
    message = fee.promoMessage.trim();
  } else if (fee.discountAmountInr > 0) {
    message = `List price ₹${fee.amountInr}, discount ₹${fee.discountAmountInr}. Amount due: ₹${fee.effectiveAmountInr}.`;
  } else {
    message = `Amount due: ₹${fee.effectiveAmountInr}.`;
  }

  return {
    title,
    message,
    requiresPayment: fee.effectiveAmountInr > 0,
  };
}

export function formatProficiencyTestFeeMessage(fee: {
  listPriceInr: number;
  amountDueInr: number;
  displayName?: string;
  effectiveAmountInr?: number;
  promoMessage?: string | null;
}): string | undefined {
  const feeName = fee.displayName ?? 'proficiency test fee';
  const effectiveAmountInr = fee.effectiveAmountInr ?? fee.amountDueInr;

  if (effectiveAmountInr <= 0 && fee.listPriceInr > 0) {
    return buildWaivedFeeMessage(feeName, fee.listPriceInr);
  }
  if (effectiveAmountInr > 0) {
    if (fee.promoMessage?.trim()) {
      return fee.promoMessage.trim();
    }
    return `Amount due before the test: ₹${effectiveAmountInr}.`;
  }
  return undefined;
}
