import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { GET_MY_TUTOR_PROFILE } from '@tutorix/shared-graphql';
import { BRAND_NAME } from '../../config';
import {
  ONBOARDING_STEPS,
  normalizeCertificationStage,
  type OnboardingStepId,
  type StepComponentProps,
} from './types';
import { OnboardingStepper } from './OnboardingStepper';
import { TutorAddressEntry } from './tutor-address-entry';
import { TutorQualificationExperience } from './tutor-qualification-experience';
import { TutorOfferings } from './tutor-offerings';
import { TutorPT } from './tutor-pt';
import { TutorRegistrationPayment } from './tutor-registration-payment';
import { TutorDocsUpload } from './tutor-docs-upload';
import { TutorInterview } from './tutor-interview';
import { TutorOnboardingComplete } from './tutor-onboarding-complete';

type TutorOnboardingProps = {
  /** Initial profile (e.g. from App after login) - used to show correct step immediately */
  initialProfile?: { certificationStage?: string } | null;
  onComplete?: () => void;
  onBack?: () => void;
};

const STEP_COMPONENTS: Record<OnboardingStepId, React.FC<StepComponentProps>> = {
  address: TutorAddressEntry,
  qualificationExperience: TutorQualificationExperience,
  offerings: TutorOfferings,
  pt: TutorPT,
  registrationPayment: TutorRegistrationPayment,
  docs: TutorDocsUpload,
  interview: TutorInterview,
  complete: TutorOnboardingComplete,
};

function stepIndexFromStage(stage: string | undefined): number {
  const normalized = normalizeCertificationStage(stage);
  if (!normalized) return 0;
  const idx = ONBOARDING_STEPS.findIndex((s) => s.id === normalized);
  return idx >= 0 ? idx : 0;
}

export const TutorOnboarding: React.FC<TutorOnboardingProps> = ({
  initialProfile,
  onComplete,
  onBack,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(() =>
    stepIndexFromStage(initialProfile?.certificationStage)
  );
  const { data: profileData } = useQuery(GET_MY_TUTOR_PROFILE, {
    fetchPolicy: 'cache-and-network',
  });

  // Sync step with certificationStage when profile loads (e.g. tutor returns to onboarding)
  useEffect(() => {
    const rawStage =
      profileData?.myTutorProfile?.certificationStage ??
      initialProfile?.certificationStage;
    const stage = normalizeCertificationStage(rawStage);
    if (!stage) return;
    const idx = ONBOARDING_STEPS.findIndex((s) => s.id === stage);
    if (idx >= 0) setCurrentStepIndex(idx);
  }, [profileData?.myTutorProfile?.certificationStage, initialProfile?.certificationStage]);

  const tutorName = useMemo(() => {
    const user = profileData?.myTutorProfile?.user;
    if (!user) return null;
    const first = user.firstName?.trim() || '';
    const last = user.lastName?.trim() || '';
    return [first, last].filter(Boolean).join(' ') || null;
  }, [profileData]);

  const stepConfig = useMemo(
    () => ONBOARDING_STEPS[currentStepIndex],
    [currentStepIndex]
  );
  const StepComponent = useMemo(
    () => STEP_COMPONENTS[stepConfig.id],
    [stepConfig.id]
  );
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === ONBOARDING_STEPS.length - 1;

  const handleStepComplete = () => {
    if (isLastStep) {
      onComplete?.();
    } else {
      setCurrentStepIndex((i) => i + 1);
    }
  };

  const handleStepBack = () => {
    if (isFirstStep) {
      onBack?.();
    } else {
      setCurrentStepIndex((i) => i - 1);
    }
  };

  const showStepper = stepConfig.id !== 'complete';

  return (
    <div className="w-full max-w-5xl rounded-2xl border border-subtle bg-white p-8 shadow-lg">
      {/* Header with tutor name */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            {BRAND_NAME} - Onboarding & Certification
          </h1>
          <p className="mt-1 text-sm text-muted">
            {stepConfig.id === 'complete'
              ? "You're all set!"
              : `Step ${currentStepIndex + 1} of ${ONBOARDING_STEPS.length} · ${stepConfig.title}`}
          </p>
        </div>
        {tutorName && (
          <div className="shrink-0 rounded-lg bg-primary/5 px-4 py-2">
            <span className="text-sm font-medium text-primary">{tutorName}</span>
          </div>
        )}
      </div>

      {/* Step progress indicator - circles with icons and connection lines */}
      {showStepper && (
        <div className="mb-8 rounded-lg border border-subtle bg-gray-50/80 px-6 py-5">
          <OnboardingStepper currentStepIndex={currentStepIndex} />
        </div>
      )}

      <StepComponent
        onComplete={handleStepComplete}
        onBack={isFirstStep ? onBack : handleStepBack}
      />
    </div>
  );
};
