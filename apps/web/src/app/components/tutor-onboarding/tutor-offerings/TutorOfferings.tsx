import React from 'react';
import type { StepComponentProps } from '../types';

export const TutorOfferings: React.FC<StepComponentProps> = ({
  onComplete,
  onBack,
}) => {
  return (
    <div className="space-y-6">
      <p className="text-muted">
        Choose the subjects and grades you want to teach. This step will be
        implemented soon.
      </p>

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
          onClick={onComplete}
          className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5]"
        >
          Continue
        </button>
      </div>
    </div>
  );
};
