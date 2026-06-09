import React from 'react';
import type { StudentOnboardingStepId } from './types';
import { STUDENT_ONBOARDING_STEPS } from './types';

const STEP_SHORT_LABELS: Record<StudentOnboardingStepId, string> = {
  parent: 'Parent',
  address: 'Address',
  education: 'Education',
};

type StudentOnboardingStepperProps = {
  currentStepIndex: number;
};

export const StudentOnboardingStepper: React.FC<StudentOnboardingStepperProps> = ({
  currentStepIndex,
}) => {
  const steps = STUDENT_ONBOARDING_STEPS;

  return (
    <div className="flex items-start justify-between gap-1">
      {steps.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const isPending = index > currentStepIndex;

        return (
          <React.Fragment key={step.id}>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isCurrent
                      ? 'bg-[#5fa8ff] text-white'
                      : 'bg-gray-200 text-muted'
                }`}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              <span
                className={`text-center text-xs font-medium ${
                  isCurrent ? 'text-primary' : isPending ? 'text-muted' : 'text-primary/70'
                }`}
              >
                {STEP_SHORT_LABELS[step.id]}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`mt-4 h-0.5 min-w-[12px] flex-1 ${
                  index < currentStepIndex ? 'bg-emerald-400' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
