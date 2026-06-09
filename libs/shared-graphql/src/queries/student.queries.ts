import { gql } from '@apollo/client';

export const GET_MY_STUDENT_PROFILE = gql`
  query GetMyStudentProfile {
    myStudentProfile {
      id
      userId
      onboardingStage
      onBoardingComplete
      parentRelation
      parentName
      studentType
      schoolClass
      board
      boardOther
      user {
        id
        firstName
        lastName
        profilePicture
        profilePictureThumbnailMedium
        profilePictureThumbnailLarge
        profilePictureOriginalUrl
      }
      addresses {
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
        primary
      }
    }
  }
`;
