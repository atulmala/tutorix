import {
  openPaymentCheckout,
  checkoutSession,
  type CheckoutResult,
  type ConfirmPaymentInput,
  type PaymentOrderSession,
} from './payment-checkout';

export { formatProficiencyTestFeeMessage } from './payment-checkout';

export type PtFeePaymentStatus = 'waived' | 'pending' | 'paid';

export type PtFeeInfo = {
  listPriceInr: number;
  collectionEnabled: boolean;
  amountDueInr: number;
  paymentStatus: PtFeePaymentStatus;
  displayLabel: string;
};

export function isPtFeePaymentRequired(fee: PtFeeInfo): boolean {
  return (
    fee.collectionEnabled &&
    fee.amountDueInr > 0 &&
    fee.paymentStatus === 'pending'
  );
}

export async function runPtFeePaymentCheckout(
  tutorOfferingId: number,
  initiatePtFeePayment: (
    offeringId: number,
  ) => Promise<CheckoutResult | null | undefined>,
  confirmPtFeePayment: (
    input: ConfirmPaymentInput & { tutorOfferingId: number },
  ) => Promise<unknown>,
  openCheckout: (
    session: PaymentOrderSession,
  ) => Promise<ConfirmPaymentInput> = openPaymentCheckout,
): Promise<CheckoutResult> {
  const checkout = await initiatePtFeePayment(tutorOfferingId);
  if (!checkout) {
    throw new Error('Could not initiate proficiency test fee payment');
  }

  const session = checkoutSession(checkout);
  if (session.skipped) {
    return checkout;
  }

  const confirmation = await openCheckout(session);
  await confirmPtFeePayment({
    tutorOfferingId,
    provider: confirmation.provider,
    orderId: confirmation.orderId,
    paymentId: confirmation.paymentId,
    signature: confirmation.signature,
    fetchFromGateway: confirmation.fetchFromGateway ?? false,
  });
  return checkout;
}

export type { PaymentOrderSession, CheckoutResult };
