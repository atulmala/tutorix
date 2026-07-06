import { gql } from '@apollo/client';

export const MY_WALLET = gql`
  query MyWallet {
    myWallet {
      balanceInr
    }
  }
`;

export const MY_WALLET_TRANSACTIONS = gql`
  query MyWalletTransactions($first: Int, $offset: Int) {
    myWalletTransactions(first: $first, offset: $offset) {
      hasMore
      items {
        id
        createdDate
        type
        amountInr
        balanceAfterInr
        description
        commerceOrderId
      }
    }
  }
`;

export const PREPARE_WALLET_PURCHASE = gql`
  query PrepareWalletPurchase($input: WalletPurchasePreviewInput!) {
    prepareWalletPurchase(input: $input) {
      purchaseAmountInr
      walletBalanceInr
      shortfallInr
      canPayFromWallet
      purchaseDescription
    }
  }
`;
