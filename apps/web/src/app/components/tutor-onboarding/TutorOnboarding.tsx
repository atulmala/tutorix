import React, { useMemo, useState } from 'react';
import { BRAND_NAME } from '../../config';
import {
  ONBOARDING_STEPS,
  type OnboardingStepId,
  type StepComponentProps,
} from './types';
import { TutorAddressEntry } from './tutor-address-entry';
import { TutorQualificationExperience } from './tutor-qualification-experience';
import { TutorOfferings } from './tutor-offerings';
import { TutorPT } from './tutor-pt';
import { TutorRegistrationPayment } from './tutor-registration-payment';
import { TutorDocsUpload } from './tutor-docs-upload';
import { TutorInterview } from './tutor-interview';
import { TutorOnboardingComplete } from './tutor-onboarding-complete';

type TutorOnboardingProps = {
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

export const TutorOnboarding: React.FC<TutorOnboardingProps> = ({
  onComplete,
  onBack,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

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

  return (
    <div className="w-full max-w-5xl rounded-2xl border border-subtle bg-white p-8 shadow-md">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary">
          Welcome to {BRAND_NAME}
        </h1>
        <p className="mt-2 text-base text-muted">
          Please complete your onboarding
        </p>
        <div className="mt-4 flex items-center gap-2 text-sm text-muted">
          <span>
            Step {currentStepIndex + 1} of {ONBOARDING_STEPS.length}
          </span>
          <span aria-hidden>·</span>
          <span className="font-medium text-primary">{stepConfig.title}</span>
        </div>
      </div>

      <StepComponent
        onComplete={handleStepComplete}
        onBack={isFirstStep ? onBack : handleStepBack}
      />
    </div>
  );
};
