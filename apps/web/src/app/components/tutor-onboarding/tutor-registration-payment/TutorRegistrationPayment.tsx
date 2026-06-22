import React, { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  COMPLETE_REGISTRATION_PAYMENT_STEP,
  CONFIRM_PLATFORM_FEE_PAYMENT,
  GET_MY_TUTOR_PROFILE,
  GET_PLATFORM_FEE,
  INITIATE_PLATFORM_FEE_PAYMENT,
} from '@tutorix/shared-graphql';
import {
  formatPlatformFeeSummary,
  openPaymentCheckout,
  checkoutSession,
  type CheckoutResult,
} from '@tutorix/shared-utils';
import type { StepComponentProps } from '../types';

export const TutorRegistrationPayment: React.FC<StepComponentProps> = () => {
  const [errorText, setErrorText] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const { data: feeData, loading: feeLoading } = useQuery(GET_PLATFORM_FEE, {
    variables: { code: 'TUTOR_REGISTRATION' },
  });
  const fee = feeData?.platformFee;
  const summary = fee ? formatPlatformFeeSummary(fee) : null;

  const [initiatePayment] = useMutation(INITIATE_PLATFORM_FEE_PAYMENT);
  const [confirmPayment] = useMutation(CONFIRM_PLATFORM_FEE_PAYMENT);
  const [completeStep, { loading: completing }] = useMutation(
    COMPLETE_REGISTRATION_PAYMENT_STEP,
    {
      refetchQueries: [{ query: GET_MY_TUTOR_PROFILE }],
      awaitRefetchQueries: true,
    },
  );

  const handleContinue = async () => {
    setErrorText(null);
    try {
      const initiateResult = await initiatePayment({
        variables: { feeCode: 'TUTOR_REGISTRATION' },
      });
      const checkout = initiateResult.data
        ?.initiatePlatformFeePayment as CheckoutResult;
      setOrderNumber(checkout?.order?.orderNumber ?? null);
      const session = checkoutSession(checkout);

      if (!session.skipped) {
        const confirmation = await openPaymentCheckout(session);
        await confirmPayment({
          variables: {
            input: {
              feeCode: 'TUTOR_REGISTRATION',
              provider: confirmation.provider,
              orderId: confirmation.orderId,
              paymentId: confirmation.paymentId,
              signature: confirmation.signature,
            },
          },
        });
      }

      await completeStep();
    } catch (error) {
      setErrorText(
        error instanceof Error
          ? error.message
          : 'Could not complete registration payment. Try again or contact support.',
      );
    }
  };

  const loading = feeLoading || completing;

  return (
    <div className="space-y-6">
      {fee ? (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <p className="font-medium">{summary?.title ?? fee.displayName}</p>
          {summary?.message ? (
            <p className="mt-2 text-amber-900">{summary.message}</p>
          ) : null}
          {orderNumber ? (
            <p className="mt-2 text-amber-900">Order {orderNumber}</p>
          ) : null}
        </div>
      ) : null}
      {errorText ? (
        <p className="text-sm text-red-700" role="alert">
          {errorText}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleContinue()}
          disabled={loading || !fee}
          className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5] disabled:opacity-50"
        >
          {loading
            ? 'Processing…'
            : summary?.requiresPayment
              ? `Pay ₹${fee?.effectiveAmountInr ?? ''}`
              : 'Continue'}
        </button>
      </div>
    </div>
  );
};
