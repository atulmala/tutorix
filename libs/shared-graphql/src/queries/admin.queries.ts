import { gql } from '@apollo/client';

export const GET_ADMIN_DASHBOARD_STATS = gql`
  query GetAdminDashboardStats {
    adminDashboardStats {
      tutorSignupCount
      studentSignupCount
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
      }
    }
  }
`;

export const GET_ADMIN_TUTOR_STAGE_COUNTS = gql`
  query GetAdminTutorStageCounts($search: String) {
    adminTutorStageCounts(search: $search) {
      stage
      count
    }
  }
`;
