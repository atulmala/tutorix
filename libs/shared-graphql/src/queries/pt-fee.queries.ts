import { gql } from '@apollo/client';

export const GET_PT_FEE_INFO = gql`
  query GetPtFeeInfo($tutorOfferingId: ID!) {
    ptFeeInfo(tutorOfferingId: $tutorOfferingId) {
      listPriceInr
      amountDueInr
      collectionEnabled
      paymentStatus
      displayLabel
    }
  }
`;
