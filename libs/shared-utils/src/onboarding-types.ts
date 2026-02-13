/**
 * Shared types for tutor onboarding flow.
 * Used by web and mobile apps.
 *
 * Aligned with TutorCertificationStageEnum / TutorOnboardingStepEnum in
 * apps/api/.../tutor/enums/tutor.enums.ts
 */

export type OnboardingStepId =
  | 'address'
  | 'qualification'
  | 'experience'
  | 'offerings'
  | 'pt'
  | 'registrationPayment'
  | 'docs'
  | 'interview'
  | 'complete';

export interface OnboardingStepConfig {
  id: OnboardingStepId;
  title: string;
  description?: string;
}

export const ONBOARDING_STEPS: OnboardingStepConfig[] = [
  {
    id: 'address',
    title: 'Address',
    description: 'Enter your address details',
  },
  {
    id: 'qualification',
    title: 'Qualifications',
    description: 'Add your educational qualifications',
  },
  {
    id: 'experience',
    title: 'Experience',
    description: 'Tell us about your teaching and work experience',
  },
  {
    id: 'offerings',
    title: 'Offerings',
    description: 'Choose subjects and grades you want to teach',
  },
  {
    id: 'pt',
    title: 'Proficiency Test',
    description: 'Complete the subject proficiency test',
  },
  {
    id: 'registrationPayment',
    title: 'Registration Fee',
    description: 'Pay your registration fee',
  },
  {
    id: 'docs',
    title: 'Documents Upload',
    description: 'Upload your documents for verification',
  },
  {
    id: 'interview',
    title: 'Interview',
    description: 'Schedule and attend your interview',
  },
  {
    id: 'complete',
    title: 'Onboarding Complete',
    description: 'Welcome to the tutor community',
  },
];

export interface StepComponentProps {
  onComplete: () => void;
  onBack?: () => void;
}

/**
 * Normalize certificationStage from API (may be SCREAMING_SNAKE_CASE)
 * to step id format (camelCase).
 * Maps legacy 'qualificationExperience' to 'qualification' for backward compatibility.
 */
export function normalizeCertificationStage(
  stage: string | undefined
): OnboardingStepId | undefined {
  if (!stage || typeof stage !== 'string') return undefined;
  const trimmed = stage.trim();
  if (!trimmed) return undefined;
  // Legacy: map qualificationExperience -> qualification (used before split)
  if (trimmed === 'qualificationExperience') return 'qualification';
  if (ONBOARDING_STEPS.some((s) => s.id === trimmed))
    return trimmed as OnboardingStepId;
  const camel = trimmed
    .toLowerCase()
    .split('_')
    .map((part, i) =>
      i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join('');
  if (camel === 'qualificationexperience') return 'qualification';
  return ONBOARDING_STEPS.some((s) => s.id === camel)
    ? (camel as OnboardingStepId)
    : undefined;
}
