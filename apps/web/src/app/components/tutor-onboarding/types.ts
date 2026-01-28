/**
 * Shared types for tutor onboarding flow.
 */

export type OnboardingStepId =
  | 'address'
  | 'qualificationExperience'
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
    id: 'qualificationExperience',
    title: 'Qualifications & Experience',
    description: 'Tell us about your education and teaching experience',
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
