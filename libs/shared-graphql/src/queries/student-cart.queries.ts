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

export const TUTOR_CLASS_BOOKINGS = gql`
  query TutorClassBookings($input: TutorClassBookingListInput!) {
    tutorClassBookings(input: $input) {
      items {
        orderItemId
        bookedAt
        studentName
        offeringLabel
        classCount
        deliveryMode
        schedulingStatus
        conclusionStatus
        scheduledCount
        unscheduledCount
        cancelledCount
        concludedCount
        linePaidInr
        isDemo
      }
      totalCount
      page
      pageSize
      totalPages
    }
  }
`;

export const STUDENT_CLASS_BOOKINGS = gql`
  query StudentClassBookings($input: StudentClassBookingListInput!) {
    studentClassBookings(input: $input) {
      items {
        orderItemId
        bookedAt
        tutorId
        tutorName
        offeringLabel
        classCount
        deliveryMode
        schedulingStatus
        conclusionStatus
        scheduledCount
        unscheduledCount
        cancelledCount
        concludedCount
        linePaidInr
        isDemo
      }
      tutors {
        id
        name
      }
      subjects
      totalCount
      page
      pageSize
      totalPages
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
      refundableInr
      isDemo
    }
  }
`;
