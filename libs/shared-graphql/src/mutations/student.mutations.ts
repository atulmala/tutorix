import { gql } from '@apollo/client';

export const SAVE_STUDENT_PARENT_STEP = gql`
  mutation SaveStudentParentStep($input: SaveStudentParentInput!) {
    saveStudentParentStep(input: $input) {
      id
      onboardingStage
      parentRelation
      parentName
    }
  }
`;

export const CREATE_STUDENT_ADDRESS = gql`
  mutation CreateStudentAddress($input: CreateAddressInput!) {
    createStudentAddress(input: $input) {
      id
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
  }
`;

export const SAVE_STUDENT_EDUCATION = gql`
  mutation SaveStudentEducation($input: SaveStudentEducationInput!) {
    saveStudentEducation(input: $input) {
      id
      onboardingStage
      onBoardingComplete
      studentType
      schoolClass
      board
      boardOther
    }
  }
`;

export const COMPLETE_STUDENT_REGISTRATION_PAYMENT_STEP = gql`
  mutation CompleteStudentRegistrationPaymentStep {
    completeStudentRegistrationPaymentStep {
      id
      onboardingStage
      onBoardingComplete
      regFeePaid
      regFeeAmount
    }
  }
`;
