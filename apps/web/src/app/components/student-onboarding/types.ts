export type {
  StudentOnboardingStepId,
  StudentOnboardingStepConfig,
} from '@tutorix/shared-utils';
export {
  STUDENT_ONBOARDING_STEPS,
  normalizeStudentOnboardingStage,
  STUDENT_TYPE_OPTIONS,
  SCHOOL_BOARD_OPTIONS,
} from '@tutorix/shared-utils';

export type StudentStepComponentProps = {
  onComplete: () => void;
};
