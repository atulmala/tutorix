import { gql } from '@apollo/client';

export const GET_CLASS_PRICING_SETTINGS = gql`
  query ClassPricingSettings {
    classPricingSettings {
      minimumOnlinePricePerClassInr
      minimumOfflinePricePerClassInr
      commissionSlabThresholdInr
      tutorCommissionPercentUpToSlab
      tutorCommissionPercentAboveSlab
      platformFeePerParticipantInr
    }
  }
`;

export const GET_ADMIN_CLASS_PRICING_SETTINGS = gql`
  query AdminClassPricingSettings {
    adminClassPricingSettings {
      minimumOnlinePricePerClassInr
      minimumOfflinePricePerClassInr
      commissionSlabThresholdInr
      tutorCommissionPercentUpToSlab
      tutorCommissionPercentAboveSlab
      platformFeePerParticipantInr
    }
  }
`;
