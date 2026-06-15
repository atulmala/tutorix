import { gql } from '@apollo/client';

export const GET_ADMIN_PLATFORM_FEES = gql`
  query GetAdminPlatformFees {
    adminPlatformFees {
      id
      code
      displayName
      amountInr
      discountType
      discountValue
      discountAmountInr
      effectiveAmountInr
      waived
      promoMessage
    }
  }
`;

export const GET_PLATFORM_FEE = gql`
  query GetPlatformFee($code: PlatformFeeCode!) {
    platformFee(code: $code) {
      code
      displayName
      amountInr
      discountType
      discountValue
      discountAmountInr
      effectiveAmountInr
      waived
      promoMessage
      displayLabel
    }
  }
`;
