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
