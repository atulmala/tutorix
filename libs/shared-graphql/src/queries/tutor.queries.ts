import { gql } from '@apollo/client';

/**
 * Get current tutor profile with addresses
 * Used to check if tutor has completed onboarding
 */
export const GET_MY_TUTOR_PROFILE = gql`
  query GetMyTutorProfile {
    myTutorProfile {
      id
      userId
      onBoardingComplete
      certificationStage
      user {
        id
        firstName
        lastName
      }
      addresses {
        id
        type
        street
        subArea
        city
        state
        country
        postalCode
        fullAddress
        latitude
        longitude
      }
      qualifications {
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
      yearsOfExperience
      experiences {
        id
        jobTitle
        employerName
        employerAddress
        employmentType
        startDate
        endDate
        isCurrent
      }
      tutorOfferings {
        id
        offeringId
        proficiencyTestId
        status
        attemptsUsed
        lastScore
        lastMaxScore
        passedAt
        lastAttemptAt
        isInitialOnboarding
        offering {
          id
          name
          displayName
        }
      }
      documents {
        id
        name
        documentType
        documentForType
        filename
        mimeType
        size
        storageKey
        thumbnailSmall
        previewUrl
        verified
        verificationWorkflowStatus
        screening {
          status
          summaryNotes
        }
      }
    }
  }
`;
