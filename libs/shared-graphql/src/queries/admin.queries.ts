import { gql } from '@apollo/client';

export const GET_ADMIN_DASHBOARD_STATS = gql`
  query GetAdminDashboardStats {
    adminDashboardStats {
      tutorSignupCount
      studentSignupCount
      tutorOnlineUsers
      studentOnlineUsers
      tutorActiveSessions
      studentActiveSessions
    }
  }
`;

export const GET_ADMIN_TUTORS = gql`
  query GetAdminTutors($input: AdminTutorListInput!) {
    adminTutors(input: $input) {
      totalCount
      page
      pageSize
      totalPages
      items {
        id
        firstName
        lastName
        email
        mobile
        mobileCountryCode
        mobileNumber
        certificationStage
        daysInStage
        pendingAdminDocumentReview
      }
    }
  }
`;

export const GET_ADMIN_TUTOR_STAGE_COUNTS = gql`
  query GetAdminTutorStageCounts($search: String) {
    adminTutorStageCounts(search: $search) {
      stage
      count
      pendingDocumentReviewCount
    }
  }
`;

export const GET_ADMIN_TUTOR_DETAIL = gql`
  query GetAdminTutorDetail($tutorId: Int!) {
    adminTutorDetail(tutorId: $tutorId) {
      id
      certificationStage
      yearsOfExperience
      regFeePaid
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
      }
      documents {
        id
        name
        documentType
        filename
        mimeType
        previewUrl
        viewUrl
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
