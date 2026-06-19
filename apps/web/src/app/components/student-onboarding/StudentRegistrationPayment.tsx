import React, { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  COMPLETE_STUDENT_REGISTRATION_PAYMENT_STEP,
  CONFIRM_PLATFORM_FEE_PAYMENT,
  GET_MY_STUDENT_PROFILE,
  GET_PLATFORM_FEE,
  INITIATE_PLATFORM_FEE_PAYMENT,
} from '@tutorix/shared-graphql';
import {
  formatPlatformFeeSummary,
  openPaymentCheckout,
  type PaymentOrderSession,
} from '@tutorix/shared-utils';
import type { StudentStepComponentProps } from './types';

export const StudentRegistrationPayment: React.FC<StudentStepComponentProps> = ({
  onComplete,
}) => {
  const [errorText, setErrorText] = useState<string | null>(null);
  const { data: feeData, loading: feeLoading } = useQuery(GET_PLATFORM_FEE, {
    variables: { code: 'STUDENT_REGISTRATION' },
  });
  const fee = feeData?.platformFee;
  const summary = fee ? formatPlatformFeeSummary(fee) : null;

  const [initiatePayment] = useMutation(INITIATE_PLATFORM_FEE_PAYMENT);
  const [confirmPayment] = useMutation(CONFIRM_PLATFORM_FEE_PAYMENT);
  const [completeStep, { loading: completing }] = useMutation(
    COMPLETE_STUDENT_REGISTRATION_PAYMENT_STEP,
    {
      refetchQueries: [{ query: GET_MY_STUDENT_PROFILE }],
      awaitRefetchQueries: true,
      onCompleted: () => onComplete(),
    },
  );

  const handleContinue = async () => {
    setErrorText(null);
    try {
      const initiateResult = await initiatePayment({
        variables: { feeCode: 'STUDENT_REGISTRATION' },
      });
      const session = initiateResult.data
        ?.initiatePlatformFeePayment as PaymentOrderSession;

      if (session && !session.skipped) {
        const confirmation = await openPaymentCheckout(session);
        await confirmPayment({
          variables: {
            input: {
              feeCode: 'STUDENT_REGISTRATION',
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
          <p className="font-medium">{summary?.title}</p>
          <p className="mt-2">
            List price: ₹{fee.amountInr}
            {fee.discountAmountInr > 0
              ? ` · Discount: ₹${fee.discountAmountInr}`
              : null}
            {fee.effectiveAmountInr <= 0
              ? ' · No payment required'
              : ` · Amount due: ₹${fee.effectiveAmountInr}`}
          </p>
          {summary?.message ? (
            <p className="mt-2 text-amber-900">{summary.message}</p>
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
