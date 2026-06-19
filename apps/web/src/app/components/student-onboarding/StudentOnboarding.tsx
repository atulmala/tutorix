import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_MY_STUDENT_PROFILE } from '@tutorix/shared-graphql';
import { BRAND_NAME } from '../../config';
import {
  STUDENT_ONBOARDING_STEPS,
  normalizeStudentOnboardingStage,
  type StudentOnboardingStepId,
  type StudentStepComponentProps,
} from './types';
import { StudentOnboardingStepper } from './StudentOnboardingStepper';
import { StudentParentStep } from './StudentParentStep';
import { StudentAddressStep } from './StudentAddressStep';
import { StudentEducationStep } from './StudentEducationStep';
import { StudentRegistrationPayment } from './StudentRegistrationPayment';

type StudentOnboardingProps = {
  initialProfile?: { onboardingStage?: string } | null;
  onComplete?: () => void;
};

const STEP_COMPONENTS: Record<
  StudentOnboardingStepId,
  React.FC<StudentStepComponentProps>
> = {
  parent: StudentParentStep,
  address: StudentAddressStep,
  education: StudentEducationStep,
  registrationPayment: StudentRegistrationPayment,
};

function stepIndexFromStage(stage: string | undefined): number {
  const normalized = normalizeStudentOnboardingStage(stage);
  if (!normalized) return 0;
  const idx = STUDENT_ONBOARDING_STEPS.findIndex((s) => s.id === normalized);
  return idx >= 0 ? idx : 0;
}

export const StudentOnboarding: React.FC<StudentOnboardingProps> = ({
  initialProfile,
  onComplete,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(() =>
    stepIndexFromStage(initialProfile?.onboardingStage),
  );

  const { data: profileData } = useQuery(GET_MY_STUDENT_PROFILE, {
    fetchPolicy: 'cache-and-network',
  });
  const myStudentProfile = profileData?.myStudentProfile;

  useEffect(() => {
    const rawStage =
      myStudentProfile?.onboardingStage ?? initialProfile?.onboardingStage;
    const stage = normalizeStudentOnboardingStage(rawStage);
    if (!stage) return;
    const idx = STUDENT_ONBOARDING_STEPS.findIndex((s) => s.id === stage);
    if (idx < 0) return;
    setCurrentStepIndex((current) => (idx >= current ? idx : current));
  }, [myStudentProfile, initialProfile?.onboardingStage]);

  const studentName = useMemo(() => {
    const user = profileData?.myStudentProfile?.user;
    if (!user) return null;
    const first = user?.firstName?.trim() || '';
    const last = user?.lastName?.trim() || '';
    return [first, last].filter(Boolean).join(' ') || null;
  }, [profileData]);

  const stepConfig = useMemo(
    () => STUDENT_ONBOARDING_STEPS[currentStepIndex],
    [currentStepIndex],
  );
  const StepComponent = useMemo(
    () => STEP_COMPONENTS[stepConfig.id],
    [stepConfig.id],
  );
  const isLastStep = currentStepIndex === STUDENT_ONBOARDING_STEPS.length - 1;

  const handleStepComplete = () => {
    if (isLastStep) {
      onComplete?.();
    } else {
      setCurrentStepIndex((i) => i + 1);
    }
  };

  return (
    <div className="w-full max-w-5xl rounded-2xl border border-subtle bg-white p-8 shadow-lg">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            {BRAND_NAME} - Student Setup
          </h1>
          <p className="mt-1 text-sm text-muted">
            Step {currentStepIndex + 1} of {STUDENT_ONBOARDING_STEPS.length} ·{' '}
            {stepConfig.title}
          </p>
        </div>
        {studentName && (
          <div className="shrink-0 rounded-lg bg-primary/5 px-4 py-2">
            <span className="text-sm font-medium text-primary">{studentName}</span>
          </div>
        )}
      </div>

      <div className="mb-8 rounded-lg border border-subtle bg-gray-50/80 px-6 py-5">
        <StudentOnboardingStepper currentStepIndex={currentStepIndex} />
      </div>

      <StepComponent onComplete={handleStepComplete} />
    </div>
  );
};
