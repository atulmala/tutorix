import React from 'react';
import { useQuery } from '@apollo/client';
import { GET_MY_TUTOR_PROFILE } from '@tutorix/shared-graphql';
import {
  APPLICATION_REVIEW_MESSAGE,
  ONBOARDING_APPROVED_MESSAGE,
  normalizeCertificationStage,
} from '@tutorix/shared-utils';
import type { StepComponentProps } from '../types';

export const TutorInterview: React.FC<StepComponentProps> = () => {
  const { data: profileData } = useQuery(GET_MY_TUTOR_PROFILE, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 30_000,
  });

  const tutor = profileData?.myTutorProfile;
  const approved =
    tutor?.onBoardingComplete === true ||
    normalizeCertificationStage(tutor?.certificationStage) === 'complete';

  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${
        approved
          ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
          : 'border-amber-200 bg-amber-50 text-amber-950'
      }`}
      role="status"
    >
      <p>{approved ? ONBOARDING_APPROVED_MESSAGE : APPLICATION_REVIEW_MESSAGE}</p>
    </div>
  );
};
