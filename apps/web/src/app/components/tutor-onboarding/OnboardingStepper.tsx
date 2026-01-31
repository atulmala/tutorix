import React from 'react';
import type { OnboardingStepId } from './types';
import { ONBOARDING_STEPS } from './types';

const STEP_SHORT_LABELS: Record<OnboardingStepId, string> = {
  address: 'Address',
  qualificationExperience: 'Qualification',
  offerings: 'Offerings',
  pt: 'Proficiency',
  registrationPayment: 'Payment',
  docs: 'Documents',
  interview: 'Interview',
  complete: 'Onboarding Complete!',
};

const STEP_ICONS: Record<OnboardingStepId, React.ReactNode> = {
  address: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  qualificationExperience: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M12 14l9-5-9-5-9 5 9 5z" />
      <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  ),
  offerings: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  pt: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  registrationPayment: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  docs: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  interview: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  complete: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      {/* Green COMPLETED stamp-style seal */}
      <circle cx="12" cy="12" r="10" fill="#a7f3d0" stroke="#059669" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="#059669" strokeWidth="0.8" opacity="0.6" />
      <path stroke="#047857" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" d="M8 12l3 3 5-6" />
    </svg>
  ),
};

type OnboardingStepperProps = {
  currentStepIndex: number;
};

export const OnboardingStepper: React.FC<OnboardingStepperProps> = ({
  currentStepIndex,
}) => {
  const steps = ONBOARDING_STEPS;

  return (
    <div className="flex items-center justify-between gap-1">
      {steps.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const isPending = index > currentStepIndex;

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div
                className={`
                  flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all
                  ${isCompleted ? 'border-emerald-500 bg-emerald-500 text-white' : ''}
                  ${isCurrent ? 'border-[#5fa8ff] bg-[#5fa8ff] text-white shadow-md ring-2 ring-[#5fa8ff]/30' : ''}
                  ${isPending ? 'border-gray-200 bg-white text-gray-400' : ''}
                `}
                title={step.title}
              >
                {isCompleted ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  STEP_ICONS[step.id]
                )}
              </div>
              <span
                className={`
                  mt-1.5 text-center text-[10px] font-medium leading-tight
                  ${step.id === 'complete' ? '' : 'max-w-[4.5rem] truncate'}
                  ${isCurrent ? 'text-[#5fa8ff]' : ''}
                  ${isCompleted ? 'text-emerald-600' : ''}
                  ${isPending ? 'text-gray-400' : ''}
                `}
              >
                {step.id === 'complete' ? (
                  <>
                    Onboarding
                    <br />
                    Complete!
                  </>
                ) : (
                  STEP_SHORT_LABELS[step.id]
                )}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`
                  h-0.5 flex-1 min-w-[12px] rounded
                  ${index < currentStepIndex ? 'bg-emerald-400' : 'bg-gray-200'}
                `}
                aria-hidden
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
