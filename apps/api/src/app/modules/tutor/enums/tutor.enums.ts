import { registerEnumType } from '@nestjs/graphql';

/**
 * Tutor Onboarding Step Enum
 *
 * Aligned with OnboardingStepId in apps/web/.../tutor-onboarding/types.ts
 * Represents each step in the tutor onboarding flow.
 */
export enum TutorOnboardingStepEnum {
  ADDRESS = 'address',
  QUALIFICATION_EXPERIENCE = 'qualificationExperience',
  OFFERINGS = 'offerings',
  PT = 'pt',
  REGISTRATION_PAYMENT = 'registrationPayment',
  DOCS = 'docs',
  INTERVIEW = 'interview',
  COMPLETE = 'complete',
}

/**
 * Tutor Certification Stage Enum
 *
 * Aligned with onboarding steps. Indicates the current/pending step for a tutor.
 * Use TutorOnboardingStepEnum for step ordering; this enum is used in DB/GraphQL.
 */
export enum TutorCertificationStageEnum {
  ADDRESS = 'address',
  QUALIFICATION_EXPERIENCE = 'qualificationExperience',
  OFFERINGS = 'offerings',
  PT = 'pt',
  REGISTRATION_PAYMENT = 'registrationPayment',
  DOCS = 'docs',
  INTERVIEW = 'interview',
  COMPLETE = 'complete',
}

registerEnumType(TutorOnboardingStepEnum, {
  name: 'TutorOnboardingStepEnum',
  description: 'Onboarding steps for tutors - aligned with frontend OnboardingStepId',
});

registerEnumType(TutorCertificationStageEnum, {
  name: 'TutorCertificationStageEnum',
  description: 'Current certification/onboarding stage of a tutor',
});




