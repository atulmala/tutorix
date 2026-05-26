import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  COMPLETE_REGISTRATION_PAYMENT_STEP,
  GET_MY_TUTOR_PROFILE,
} from '@tutorix/shared-graphql';
import { REGISTRATION_FEE_WAIVED_MESSAGE } from '@tutorix/shared-utils';
import type { StepComponentProps } from '../types';

export const TutorRegistrationPayment: React.FC<StepComponentProps> = () => {
  const [errorText, setErrorText] = useState<string | null>(null);
  const [completeStep, { loading }] = useMutation(
    COMPLETE_REGISTRATION_PAYMENT_STEP,
    {
      refetchQueries: [{ query: GET_MY_TUTOR_PROFILE }],
      awaitRefetchQueries: true,
    },
  );

  const handleContinue = async () => {
    setErrorText(null);
    try {
      await completeStep();
      // Don't call onComplete — refetch updates profileData; useEffect in TutorOnboarding
      // syncs currentStepIndex from certificationStage. Calling onComplete would
      // double-advance and skip the documents upload step.
    } catch {
      setErrorText(
        'Could not advance to documents. Try again or contact support.',
      );
    }
  };

  return (
    <div className="space-y-6">
      <div
        className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        role="status"
      >
        <p>{REGISTRATION_FEE_WAIVED_MESSAGE}</p>
        <p className="mt-2 text-amber-900">No payment is required right now.</p>
      </div>
      {errorText ? (
        <p className="text-sm text-red-700" role="alert">
          {errorText}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleContinue}
          disabled={loading}
          className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5] disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </div>
  );
};
