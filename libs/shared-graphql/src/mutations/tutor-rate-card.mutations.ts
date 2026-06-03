import { gql } from '@apollo/client';

export const SAVE_MY_TUTOR_OFFERING_RATE_CARD = gql`
  mutation SaveMyTutorOfferingRateCard($input: SaveTutorOfferingRateCardInput!) {
    saveMyTutorOfferingRateCard(input: $input) {
      freeDemoOffered
      offlineEnabled
      offlineBaseRate
      offlineBaseDiscountPct
      offlineSlab2DiscountPct
      offlineSlab3DiscountPct
      onlineEnabled
      onlineBaseRate
      onlineBaseDiscountPct
      onlineSlab2DiscountPct
      onlineSlab3DiscountPct
      offlineBatchSize
      onlineBatchSize
      isComplete
    }
  }
`;
