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
