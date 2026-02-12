import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  COMPLETE_EXPERIENCE_STEP,
  GET_MY_TUTOR_PROFILE,
} from '@tutorix/shared-graphql';
import type { StepComponentProps } from '../types';

export const TutorExperience: React.FC<StepComponentProps> = ({
  onComplete,
  onBack,
}) => {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [completeExperience, { loading: isSubmitting }] = useMutation(
    COMPLETE_EXPERIENCE_STEP,
    {
      refetchQueries: [{ query: GET_MY_TUTOR_PROFILE }],
      awaitRefetchQueries: true,
      update: (cache, { data }) => {
        if (!data?.completeExperienceStep) return;
        try {
          const existing = cache.readQuery<{
            myTutorProfile?: { id: number; certificationStage?: string };
          }>({ query: GET_MY_TUTOR_PROFILE });
          if (existing?.myTutorProfile) {
            cache.writeQuery({
              query: GET_MY_TUTOR_PROFILE,
              data: {
                myTutorProfile: {
                  ...existing.myTutorProfile,
                  certificationStage: 'offerings',
                },
              },
            });
          }
        } catch {
          /* ignore */
        }
      },
      onCompleted: () => {
        // Don't call onComplete - refetch updates profileData, useEffect in
        // TutorOnboarding syncs currentStepIndex from certificationStage.
        // Calling onComplete would double-advance and skip the next step.
      },
      onError: (error) => {
        setSubmitError(
          error.graphQLErrors?.[0]?.message ||
            error.message ||
            'Failed to complete step. Please try again.'
        );
      },
    }
  );

  const handleContinue = () => {
    setSubmitError(null);
    completeExperience();
  };

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-subtle bg-gray-50/50 p-6">
        <h3 className="text-base font-semibold text-primary mb-2">Experience entry</h3>
        <p className="text-sm text-muted">
          Teaching and work experience entry will be available here. You can continue to the next step for now.
        </p>
      </div>

      {submitError && (
        <div className="rounded-lg border border-danger bg-red-50 p-3 text-sm text-danger">
          {submitError}
        </div>
      )}

      <div className="flex justify-end gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="h-11 rounded-lg border border-subtle px-6 text-sm font-semibold text-primary shadow-sm transition hover:border-primary"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={handleContinue}
          disabled={isSubmitting}
          className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5] disabled:cursor-not-allowed disabled:bg-[#5fa8ff]/40"
        >
          {isSubmitting ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  );
};
