import { gql } from '@apollo/client';
import { CHECKOUT_RESULT_FIELDS } from '../fragments/checkout.fragments';

export const COMPLETE_WALLET_PURCHASE = gql`
  mutation CompleteWalletPurchase($purchaseIntent: WalletPurchaseIntentInput!) {
    completeWalletPurchase(purchaseIntent: $purchaseIntent) {
      wallet {
        balanceInr
      }
      orderId
      orderNumber
    }
  }
`;

export const INITIATE_WALLET_TOP_UP = gql`
  ${CHECKOUT_RESULT_FIELDS}
  mutation InitiateWalletTopUp($input: WalletTopUpInput!) {
    initiateWalletTopUp(input: $input) {
      ...CheckoutResultFields
    }
  }
`;

export const CONFIRM_WALLET_TOP_UP = gql`
  mutation ConfirmWalletTopUp($input: ConfirmWalletTopUpInput!) {
    confirmWalletTopUp(input: $input) {
      wallet {
        balanceInr
      }
      purchaseOrderId
      purchaseOrderNumber
    }
  }
`;
