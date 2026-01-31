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
 * Keys must match DB values (camelCase) so GraphQL can serialize DB strings correctly.
 */
export enum TutorCertificationStageEnum {
  address = 'address',
  qualificationExperience = 'qualificationExperience',
  offerings = 'offerings',
  pt = 'pt',
  registrationPayment = 'registrationPayment',
  docs = 'docs',
  interview = 'interview',
  complete = 'complete',
}

registerEnumType(TutorOnboardingStepEnum, {
  name: 'TutorOnboardingStepEnum',
  description: 'Onboarding steps for tutors - aligned with frontend OnboardingStepId',
});

registerEnumType(TutorCertificationStageEnum, {
  name: 'TutorCertificationStageEnum',
  description: 'Current certification/onboarding stage of a tutor',
});




