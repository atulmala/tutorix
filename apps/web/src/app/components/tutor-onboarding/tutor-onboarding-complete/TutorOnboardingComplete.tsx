import React from 'react';
import type { StepComponentProps } from '../types';

export const TutorOnboardingComplete: React.FC<StepComponentProps> = ({
  onComplete,
}) => {
  return (
    <div className="space-y-6">
      <p className="text-muted">
        Welcome! You have completed onboarding. Click below to finish.
      </p>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onComplete}
          className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5]"
        >
          Finish
        </button>
      </div>
    </div>
  );
};
