import { gql } from '@apollo/client';

/**
 * Get proficiency test by ID with questions and answers.
 */
export const GET_PROFICIENCY_TEST = gql`
  query GetProficiencyTest($id: ID!) {
    proficiencyTest(id: $id) {
      id
      name
      time
      passPercentage
      questions {
        id
        question
        questionType
        difficulty
        answers {
          id
          text
        }
      }
    }
  }
`;

/**
 * Get proficiency test with 30 random questions for a tutor offering (authenticated).
 */
export const GET_PROFICIENCY_TEST_FOR_TAKER = gql`
  query GetProficiencyTestForTaker($tutorOfferingId: ID!) {
    proficiencyTestForTaker(tutorOfferingId: $tutorOfferingId) {
      id
      name
      time
      score
      passPercentage
      questions {
        id
        question
        questionType
        difficulty
        answers {
          id
          text
          answer
        }
      }
    }
  }
`;

/**
 * Get proficiency test for a leaf offering.
 */
export const GET_PROFICIENCY_TEST_FOR_OFFERING = gql`
  query GetProficiencyTestForOffering($offeringId: ID!) {
    proficiencyTestForOffering(offeringId: $offeringId) {
      id
      name
      time
      passPercentage
      questions {
        id
        question
        questionType
        difficulty
        answers {
          id
          text
        }
      }
    }
  }
`;
