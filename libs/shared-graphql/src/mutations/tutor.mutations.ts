import { gql } from '@apollo/client';

/**
 * Save tutor qualifications (replaces all for the authenticated tutor).
 * At least one qualification must be Higher Secondary.
 */
export const SAVE_TUTOR_QUALIFICATIONS = gql`
  mutation SaveTutorQualifications($input: SaveTutorQualificationsInput!) {
    saveTutorQualifications(input: $input) {
      id
      qualificationType
      boardOrUniversity
      degreeName
      gradeType
      gradeValue
      yearObtained
      fieldOfStudy
      displayOrder
    }
  }
`;

/**
 * Save tutor experiences (replaces all for the authenticated tutor).
 * Also updates yearsOfExperience on tutor.
 */
export const SAVE_TUTOR_EXPERIENCES = gql`
  mutation SaveTutorExperiences($input: SaveTutorExperiencesInput!) {
    saveTutorExperiences(input: $input) {
      id
      jobTitle
      employerName
      employerAddress
      employmentType
      startDate
      endDate
      isCurrent
    }
  }
`;

/**
 * Complete the experience step and advance to offerings.
 */
export const COMPLETE_EXPERIENCE_STEP = gql`
  mutation CompleteExperienceStep {
    completeExperienceStep {
      id
      certificationStage
    }
  }
`;

/**
 * Save tutor offerings (leaf offering IDs) and advance to PT stage.
 */
export const SAVE_TUTOR_OFFERINGS = gql`
  mutation SaveTutorOfferings($input: SaveTutorOfferingsInput!) {
    saveTutorOfferings(input: $input) {
      id
      offeringId
      proficiencyTestId
      status
      attemptsUsed
      isInitialOnboarding
    }
  }
`;

/**
 * Submit proficiency test answers.
 */
export const SUBMIT_PROFICIENCY_TEST = gql`
  mutation SubmitProficiencyTest($input: SubmitProficiencyTestInput!) {
    submitProficiencyTest(input: $input) {
      passed
      score
      maxScore
      attemptsUsed
      passPercentage
      tutorOfferingId
    }
  }
`;

/**
 * Finish registration fee placeholder (payment TBD) and advance to documents upload.
 */
export const COMPLETE_REGISTRATION_PAYMENT_STEP = gql`
  mutation CompleteRegistrationPaymentStep {
    completeRegistrationPaymentStep {
      id
      certificationStage
    }
  }
`;

/**
 * Complete documents step when all four onboarding documents pass verification.
 */
export const COMPLETE_DOCS_STEP = gql`
  mutation CompleteDocsStep {
    completeDocsStep {
      id
      certificationStage
      onBoardingComplete
    }
  }
`;

/**
 * Mark onboarding celebration as seen after tutor visits dashboard.
 */
export const ACKNOWLEDGE_ONBOARDING_CELEBRATION = gql`
  mutation AcknowledgeOnboardingCelebration {
    acknowledgeOnboardingCelebration {
      id
      onBoardingComplete
      onboardingCelebrationSeen
      certificationStage
    }
  }
`;
