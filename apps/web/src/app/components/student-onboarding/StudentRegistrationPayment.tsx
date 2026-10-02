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
  checkoutSession,
  type CheckoutResult,
} from '@tutorix/shared-utils';
import type { StudentStepComponentProps } from './types';

export const StudentRegistrationPayment: React.FC<StudentStepComponentProps> = ({
  onComplete,
}) => {
  const [errorText, setErrorText] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const { data: feeData, loading: feeLoading } = useQuery(GET_PLATFORM_FEE, {
    variables: { code: 'STUDENT_REGISTRATION' },
  });
  const fee = feeData?.platformFee;
  const summary = fee ? formatPlatformFeeSummary(fee) : null;
  const feeMessage = summary?.message ?? fee?.promoMessage?.trim() ?? null;

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
    if (paying) {
      return;
    }
    setErrorText(null);
    setPaying(true);
    try {
      const initiateResult = await initiatePayment({
        variables: { feeCode: 'STUDENT_REGISTRATION' },
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
    } finally {
      setPaying(false);
    }
  };

  const busy = paying || completing;
  const loading = feeLoading || busy;

  return (
    <div className="space-y-6">
      {fee ? (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <p className="font-medium">{summary?.title ?? fee.displayName}</p>
          {feeMessage ? (
            <p className="mt-2 text-amber-900">{feeMessage}</p>
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
          className="flex h-11 items-center justify-center rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none disabled:hover:bg-slate-300"
        >
          {busy ? (
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent"
              aria-hidden
            />
          ) : errorText && summary?.requiresPayment ? (
            'Retry payment'
          ) : summary?.requiresPayment ? (
            `Pay ₹${fee?.effectiveAmountInr ?? ''}`
          ) : (
            'Continue'
          )}
        </button>
      </div>
    </div>
  );
};
