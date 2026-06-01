import { gql } from '@apollo/client';

export const SAVE_MY_TUTOR_OFFERING_RATE_CARD = gql`
  mutation SaveMyTutorOfferingRateCard($input: SaveTutorOfferingRateCardInput!) {
    saveMyTutorOfferingRateCard(input: $input) {
      freeDemoOffered
      offlineEnabled
      offlineBaseRate
      offlineSlab2DiscountPct
      offlineSlab3DiscountPct
      onlineEnabled
      onlineBaseRate
      onlineSlab2DiscountPct
      onlineSlab3DiscountPct
      isComplete
    }
  }
`;
