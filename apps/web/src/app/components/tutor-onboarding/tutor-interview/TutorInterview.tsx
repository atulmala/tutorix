import React from 'react';
import { useQuery } from '@apollo/client';
import {
  GET_MY_IN_APP_MESSAGES,
  GET_MY_TUTOR_PROFILE,
  GET_ON_SCREEN_COPY,
} from '@tutorix/shared-graphql';
import {
  TUTOR_APPLICATION_REVIEW_EVENT,
  TUTOR_ONBOARDING_APPROVED_EVENT,
  normalizeCertificationStage,
  resolveApplicationReviewCopy,
  resolveOnboardingApprovedCopy,
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

  const copyEvent = approved
    ? TUTOR_ONBOARDING_APPROVED_EVENT
    : TUTOR_APPLICATION_REVIEW_EVENT;

  const { data: onScreenData } = useQuery(GET_ON_SCREEN_COPY, {
    variables: { event: copyEvent },
    fetchPolicy: 'cache-and-network',
  });
  const { data: inAppData } = useQuery(GET_MY_IN_APP_MESSAGES, {
    variables: { event: copyEvent },
    fetchPolicy: 'cache-and-network',
  });

  const copyParts = {
    inAppBody: inAppData?.myInAppMessages?.[0]?.body,
    catalogBody: onScreenData?.onScreenCopy?.body,
  };
  const bannerCopy = approved
    ? resolveOnboardingApprovedCopy(copyParts)
    : resolveApplicationReviewCopy(copyParts);

  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${
        approved
          ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
          : 'border-amber-200 bg-amber-50 text-amber-950'
      }`}
      role="status"
    >
      <p>{bannerCopy}</p>
    </div>
  );
};
