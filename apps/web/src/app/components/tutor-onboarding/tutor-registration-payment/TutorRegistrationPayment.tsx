import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  COMPLETE_REGISTRATION_PAYMENT_STEP,
  GET_MY_TUTOR_PROFILE,
} from '@tutorix/shared-graphql';
import type { StepComponentProps } from '../types';

export const TutorRegistrationPayment: React.FC<StepComponentProps> = ({
  onComplete,
}) => {
  const [errorText, setErrorText] = useState<string | null>(null);
  const [completeStep, { loading }] = useMutation(
    COMPLETE_REGISTRATION_PAYMENT_STEP,
    {
      refetchQueries: [{ query: GET_MY_TUTOR_PROFILE }],
    },
  );

  const handleContinue = async () => {
    setErrorText(null);
    try {
      await completeStep();
      onComplete();
    } catch {
      setErrorText(
        'Could not advance to documents. Try again or contact support.',
      );
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-muted">
        Pay your registration fee. This step will be implemented soon.
      </p>
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
