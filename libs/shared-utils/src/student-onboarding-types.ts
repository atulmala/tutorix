/**
 * Shared types for student onboarding flow.
 * Used by web and mobile apps.
 */

export type StudentOnboardingStepId =
  | 'parent'
  | 'address'
  | 'education'
  | 'registrationPayment';

export interface StudentOnboardingStepConfig {
  id: StudentOnboardingStepId;
  title: string;
  description?: string;
}

export const STUDENT_ONBOARDING_STEPS: StudentOnboardingStepConfig[] = [
  {
    id: 'parent',
    title: 'Parent / Guardian',
    description: 'Tell us about your parent or guardian',
  },
  {
    id: 'address',
    title: 'Address',
    description: 'Where do you live?',
  },
  {
    id: 'education',
    title: 'Education',
    description: 'Tell us about your studies',
  },
  {
    id: 'registrationPayment',
    title: 'Registration Fee',
    description: 'Pay your registration fee',
  },
];

export function normalizeStudentOnboardingStage(
  stage: string | undefined | null,
): StudentOnboardingStepId | undefined {
  if (!stage) return undefined;
  const found = STUDENT_ONBOARDING_STEPS.find((s) => s.id === stage);
  return found?.id;
}

export const STUDENT_TYPE_OPTIONS = [
  { value: 'SCHOOL', label: 'School student' },
  { value: 'COLLEGE', label: 'College student' },
  { value: 'NOT_STUDYING', label: 'Currently not studying' },
  { value: 'COMPLETED', label: 'Completed study' },
] as const;

export const SCHOOL_BOARD_OPTIONS = [
  { value: 'CBSE', label: 'CBSE' },
  { value: 'ICSE', label: 'ICSE' },
  { value: 'IB', label: 'IB' },
  { value: 'OTHER', label: 'Other' },
] as const;

export type AdminStudentListTabId = StudentOnboardingStepId | 'complete';

export interface AdminStudentListTabConfig {
  id: AdminStudentListTabId;
  title: string;
}

export const ADMIN_STUDENT_LIST_TABS: AdminStudentListTabConfig[] = [
  ...STUDENT_ONBOARDING_STEPS.map(({ id, title }) => ({ id, title })),
  { id: 'complete', title: 'Onboarding Complete' },
];
