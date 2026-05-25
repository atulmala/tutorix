import React from 'react';
import { APPLICATION_REVIEW_MESSAGE } from '@tutorix/shared-utils';
import type { StepComponentProps } from '../types';

export const TutorInterview: React.FC<StepComponentProps> = () => {
  return (
    <div
      className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="status"
    >
      <p>{APPLICATION_REVIEW_MESSAGE}</p>
    </div>
  );
};
