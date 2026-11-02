import { gql } from '@apollo/client';

export const GET_ADMIN_PAYMENT_GATEWAY_FEE_CONFIG = gql`
  query AdminPaymentGatewayFeeConfig {
    adminPaymentGatewayFeeConfig {
      gstRatePercent
      gateways {
        id
        provider
        displayName
        chargePercent
      }
    }
  }
`;
