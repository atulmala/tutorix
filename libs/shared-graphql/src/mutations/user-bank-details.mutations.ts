import { gql } from '@apollo/client';

export const SAVE_MY_BANK_DETAILS = gql`
  mutation SaveMyBankDetails($input: SaveUserBankDetailsInput!) {
    saveMyBankDetails(input: $input) {
      bankName
      ifscCode
      gstNumber
      accountNumberMasked
      isComplete
    }
  }
`;
