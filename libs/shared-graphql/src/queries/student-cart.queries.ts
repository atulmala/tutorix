import { gql } from '@apollo/client';

export const STUDENT_CART_FIELDS = gql`
  fragment StudentCartFields on StudentCartDto {
    id
    itemCount
    totalInr
    items {
      id
      tutorId
      tutorOfferingId
      offeringId
      tutorName
      offeringLabel
      deliveryMode
      quantity
      unitRateInr
      lineTotalInr
    }
  }
`;

export const MY_CART = gql`
  ${STUDENT_CART_FIELDS}
  query MyCart {
    myCart {
      ...StudentCartFields
    }
  }
`;

export const PREPARE_CART_CHECKOUT = gql`
  query PrepareCartCheckout {
    prepareCartCheckout {
      cartId
      purchaseAmountInr
      walletBalanceInr
      shortfallInr
      canPayFromWallet
      items {
        id
        tutorId
        tutorOfferingId
        offeringId
        tutorName
        offeringLabel
        deliveryMode
        quantity
        unitRateInr
        lineTotalInr
      }
    }
  }
`;

export const MY_CLASS_CREDITS = gql`
  query MyClassCredits {
    myClassCredits {
      id
      tutorId
      tutorOfferingId
      offeringId
      tutorName
      offeringLabel
      deliveryMode
      status
      enrollmentId
      startsAt
    }
  }
`;
