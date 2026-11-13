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

export const GET_ADMIN_PAYMENT_PROVIDER_SELECTION = gql`
  query AdminPaymentProviderSelection {
    adminPaymentProviderSelection {
      activePaymentGateway
      tutorPayoutProvider
      paymentGatewayOptions {
        provider
        label
        configured
      }
      tutorPayoutOptions {
        provider
        label
        configured
      }
    }
  }
`;
