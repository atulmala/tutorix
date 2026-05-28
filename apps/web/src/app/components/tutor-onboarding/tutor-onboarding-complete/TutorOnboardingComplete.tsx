import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  ACKNOWLEDGE_ONBOARDING_CELEBRATION,
  GET_MY_TUTOR_PROFILE,
} from '@tutorix/shared-graphql';
import { ONBOARDING_APPROVED_MESSAGE } from '@tutorix/shared-utils';
import type { StepComponentProps } from '../types';

export const TutorOnboardingComplete: React.FC<StepComponentProps> = ({
  onComplete,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [acknowledge, { loading }] = useMutation(
    ACKNOWLEDGE_ONBOARDING_CELEBRATION,
    {
      refetchQueries: [{ query: GET_MY_TUTOR_PROFILE }],
      awaitRefetchQueries: true,
    },
  );

  const handleGoToDashboard = async () => {
    setError(null);
    try {
      await acknowledge();
      onComplete();
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : 'Could not continue. Please try again.';
      setError(message);
    }
  };

  return (
    <div className="space-y-6">
      <div
        className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950"
        role="status"
      >
        <p>{ONBOARDING_APPROVED_MESSAGE}</p>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleGoToDashboard()}
          disabled={loading}
          className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Please wait…' : 'Go to your dashboard'}
        </button>
      </div>
    </div>
  );
};
