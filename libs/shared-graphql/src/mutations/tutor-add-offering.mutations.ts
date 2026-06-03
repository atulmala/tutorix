import { gql } from '@apollo/client';

export const ADD_MY_TUTOR_OFFERING = gql`
  mutation AddMyTutorOffering($offeringId: ID!) {
    addMyTutorOffering(offeringId: $offeringId) {
      tutorOffering {
        id
        offeringId
        status
        attemptsUsed
        offering {
          id
          displayName
        }
      }
      ptFee {
        listPriceInr
        amountDueInr
        collectionEnabled
        paymentStatus
        displayLabel
      }
    }
  }
`;
