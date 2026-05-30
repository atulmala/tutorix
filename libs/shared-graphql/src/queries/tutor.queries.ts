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
      onboardingCelebrationSeen
      certificationStage
      testTutor
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

export const GET_MY_TUTOR_DETAIL = gql`
  query GetMyTutorDetail {
    myTutorDetail {
      id
      certificationStage
      yearsOfExperience
      regFeePaid
      testTutor
      regFeeAmount
      regFeeAmountToBePaid
      regFeeDate
      user {
        firstName
        lastName
        email
        mobile
        mobileCountryCode
        mobileNumber
        createdDate
        bankDetails {
          bankName
          ifscCode
          gstNumber
          accountNumberMasked
          isComplete
        }
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
        createdDate
        updatedDate
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
        createdDate
        updatedDate
      }
      experiences {
        id
        jobTitle
        employerName
        employerAddress
        employmentType
        startDate
        endDate
        isCurrent
        createdDate
        updatedDate
      }
      offerings {
        id
        offeringName
        offeringDisplayName
        status
        attemptsUsed
        attemptsRemaining
        lastScore
        lastMaxScore
        lastAttemptAt
        passedAt
        lastTimeTakenSeconds
        createdDate
      }
      documents {
        id
        name
        documentType
        filename
        mimeType
        previewUrl
        viewUrl
        createdDate
        screening {
          status
          summaryNotes
          confidence
          automatedAt
          reviewerNote
          reviewedAt
        }
      }
    }
  }
`;
