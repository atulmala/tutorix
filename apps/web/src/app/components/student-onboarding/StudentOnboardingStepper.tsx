import React from 'react';
import type { StudentOnboardingStepId } from './types';
import { STUDENT_ONBOARDING_STEPS } from './types';

function StepIcon({
  stepId,
  className,
}: {
  stepId: StudentOnboardingStepId;
  className: string;
}) {
  const iconClass = `h-4 w-4 ${className}`;
  switch (stepId) {
    case 'parent':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'address':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        </svg>
      );
    case 'education':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M22 10 12 5 2 10l10 5 10-5Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12v5c0 .7 2.7 3 6 3s6-2.3 6-3v-5" />
        </svg>
      );
    case 'registrationPayment':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8h18M3 12h18M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
        </svg>
      );
    default:
      return null;
  }
}

type StudentOnboardingStepperProps = {
  currentStepIndex: number;
};

export const StudentOnboardingStepper: React.FC<StudentOnboardingStepperProps> = ({
  currentStepIndex,
}) => {
  const steps = STUDENT_ONBOARDING_STEPS;

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const isPending = index > currentStepIndex;

        return (
          <React.Fragment key={step.id}>
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                isCompleted
                  ? 'bg-emerald-500 text-white'
                  : isCurrent
                    ? 'bg-[#5fa8ff] text-white'
                    : 'bg-gray-200 text-muted'
              }`}
              aria-label={step.title}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <StepIcon stepId={step.id} className="shrink-0" />
            </div>
            {index < steps.length - 1 && (
              <div
                className={`mx-1.5 h-0.5 min-w-[12px] flex-1 ${
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
