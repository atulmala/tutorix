/**
 * Platform-neutral payment-checkout helpers and types.
 *
 * This module intentionally contains NO browser (`window`/`document`) or
 * native-module access, so it is safe to import from both web and React
 * Native. Platform-specific behaviour (opening the actual checkout) lives in
 * `payment-checkout.ts` (web) and `payment-checkout.native.ts` (native), which
 * both re-export everything here. Keeping these pure helpers in a file with no
 * `.native` variant avoids Metro resolving an import back to itself.
 */

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

export type ConfirmPaymentInput = {
  provider?: PaymentGatewayProvider;
  orderId: string;
  paymentId: string;
  signature: string;
};

export function checkoutSession(result: CheckoutResult): PaymentOrderSession {
  return result.session ?? { skipped: true };
}

export function buildWaivedFeeMessage(feeLabel: string, amountInr: number): string {
  return `The regular ${feeLabel.toLowerCase()} is ₹${amountInr}, but it is waived for a limited time.`;
}

function isWaivedStylePromoMessage(promoMessage: string): boolean {
  return /\b(not being charged|waived|free for now|free)\b/i.test(promoMessage);
}

function resolveChargeablePromoMessage(
  fee: { promoMessage?: string | null; effectiveAmountInr: number },
): string | undefined {
  const promo = fee.promoMessage?.trim();
  if (!promo) {
    return undefined;
  }
  if (isWaivedStylePromoMessage(promo)) {
    return undefined;
  }
  return promo;
}

export type FeeDiscountPaymentMessageInput = {
  feeName: string;
  amountInr: number;
  discountAmountInr: number;
  discountType?: string;
  discountValue?: number;
  netAmountInr: number;
};

export function formatFeePaymentStageMessage(
  input: FeeDiscountPaymentMessageInput,
): string | undefined {
  const {
    feeName,
    amountInr,
    discountAmountInr,
    discountType,
    discountValue,
    netAmountInr,
  } = input;

  if (discountAmountInr <= 0) {
    return undefined;
  }

  const feeLabel = /\bfee$/i.test(feeName.trim()) ? feeName.trim() : `${feeName.trim()} fee`;

  const discountPart =
    discountType === 'PERCENT' && discountValue != null && discountValue > 0
      ? `discount ${discountValue}%`
      : `discount ₹${discountAmountInr}`;

  return `${feeLabel} ₹${amountInr}, ${discountPart}, net amount payable: ₹${netAmountInr}`;
}

export function formatPlatformFeeSummary(fee: {
  displayName?: string;
  amountInr: number;
  discountType?: string;
  discountValue?: number;
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
    message =
      fee.promoMessage?.trim() || buildWaivedFeeMessage(feeName, fee.amountInr);
  } else if (fee.discountAmountInr > 0) {
    message =
      resolveChargeablePromoMessage(fee) ??
      formatFeePaymentStageMessage({
        feeName: feeName.replace(/\s+fee$/i, ''),
        amountInr: fee.amountInr,
        discountAmountInr: fee.discountAmountInr,
        discountType: fee.discountType,
        discountValue: fee.discountValue,
        netAmountInr: fee.effectiveAmountInr,
      }) ??
      `Amount due: ₹${fee.effectiveAmountInr}.`;
  } else {
    message =
      resolveChargeablePromoMessage(fee) ??
      `Amount due: ₹${fee.effectiveAmountInr}.`;
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
  discountAmountInr?: number;
  discountType?: string;
  discountValue?: number;
  promoMessage?: string | null;
}): string | undefined {
  const feeName = fee.displayName ?? 'proficiency test fee';
  const effectiveAmountInr = fee.effectiveAmountInr ?? fee.amountDueInr;
  const discountAmountInr =
    fee.discountAmountInr ??
    Math.max(0, fee.listPriceInr - effectiveAmountInr);

  if (effectiveAmountInr <= 0 && fee.listPriceInr > 0) {
    if (fee.promoMessage?.trim()) {
      return fee.promoMessage.trim();
    }
    return buildWaivedFeeMessage(feeName, fee.listPriceInr);
  }
  if (effectiveAmountInr > 0 && discountAmountInr > 0) {
    return (
      formatFeePaymentStageMessage({
        feeName: feeName.replace(/\s+fee$/i, ''),
        amountInr: fee.listPriceInr,
        discountAmountInr,
        discountType: fee.discountType,
        discountValue: fee.discountValue,
        netAmountInr: effectiveAmountInr,
      }) ?? `Amount due before the test: ₹${effectiveAmountInr}.`
    );
  }
  if (effectiveAmountInr > 0) {
    return `Amount due before the test: ₹${effectiveAmountInr}.`;
  }
  return undefined;
}
