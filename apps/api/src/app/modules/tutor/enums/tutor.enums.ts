import { registerEnumType } from '@nestjs/graphql';

/**
 * Tutor Certification Stage Enum
 * 
 * Represents the current Certification Stage of a tutor in the system.
 */
export enum TutorCertificationStageEnum {
  REGISTERED = 'REGISTERED',
  OFFERING_PENDING = 'OFFERING_PENDING',
  SUBJECT_CHANGE = 'SUBJECT_CHANGE',
  PROFICIENCY_TEST_PENDING = 'PROFICIENCY_TEST_PENDING',
  REGISTRATION_FEE_PENDING = 'REGISTRATION_FEE_PENDING',
  THANKS = 'THANKS',
  PROFILE_COMPLETION_PENDING = 'PROFILE_COMPLETION_PENDING',
  INTERVIEW_PENDING = 'INTERVIEW_PENDING',
  BACKGROUND_CHECK_PENDING = 'BACKGROUND_CHECK_PENDING',
  CERTIFICATION_PROCESS_COMPLETED = 'CERTIFICATION_PROCESS_COMPLETED',
}

registerEnumType(TutorCertificationStageEnum, {
  name: 'TutorCertificationStageEnum',
  description: 'Status of a tutor Certification Stage in the system',
});




