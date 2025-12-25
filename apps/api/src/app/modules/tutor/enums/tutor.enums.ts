import { registerEnumType } from '@nestjs/graphql';

/**
 * Tutor Certification Stage Enum
 * 
 * Represents the current Certification Stage of a tutor in the system.
 */
export enum TutorCertificationStageEnum {
  REGISTERED = 1,
  OFFERING_PENDING,
  SUBJECT_CHANGE,
  PROFICIENCY_TEST_PENDING,
  REGISTRATION_FEE_PENDING,
  THANKS,
  PROFILE_COMPLETION_PENDING,
  INTERVIEW_PENDING,
  BACKGROUND_CHECK_PENDING,
  CERTIFICATION_PROCESS_COMPLETED,
}

registerEnumType(TutorCertificationStageEnum, {
  name: 'TutorCertificationStageEnum',
  description: 'Status of a tutor Certification Stage in the system',
});




