import {
  openPaymentCheckout,
  type ConfirmPaymentInput,
  type PaymentOrderSession,
} from './payment-checkout';

export type PtFeePaymentStatus = 'waived' | 'pending' | 'paid';

export type PtFeeInfo = {
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
  ) => Promise<PaymentOrderSession | null | undefined>,
  confirmPtFeePayment: (
    input: ConfirmPaymentInput & { tutorOfferingId: number },
  ) => Promise<unknown>,
): Promise<void> {
  const session = await initiatePtFeePayment(tutorOfferingId);
  if (!session || session.skipped) {
    return;
  }

  const confirmation = await openPaymentCheckout(session);
  await confirmPtFeePayment({
    tutorOfferingId,
    provider: confirmation.provider,
    orderId: confirmation.orderId,
    paymentId: confirmation.paymentId,
    signature: confirmation.signature,
  });
}
