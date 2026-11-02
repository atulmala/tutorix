import { gql } from '@apollo/client';

export const MY_TUTOR_EARNINGS_SUMMARY = gql`
  query MyTutorEarningsSummary {
    myTutorEarningsSummary {
      bankDetailsComplete
      nextPayout {
        startDate
        endDate
        concludedClassCount
        totalGrossInr
        totalDeductionsInr
        totalNetPayoutInr
      }
      inHold {
        startDate
        endDate
        concludedClassCount
        totalGrossInr
        totalDeductionsInr
        totalNetPayoutInr
      }
    }
  }
`;

export const MY_TUTOR_PAYOUT_PERIOD_DETAIL = gql`
  query MyTutorPayoutPeriodDetail($input: TutorPayoutPeriodInput!) {
    myTutorPayoutPeriodDetail(input: $input) {
      startDate
      endDate
      totalGrossInr
      totalCommissionInr
      totalOnlineChargesInr
      totalPaymentGatewayFeeInr
      totalPaymentGatewayGstInr
      totalPaymentGatewayChargesInr
      totalDeductionsInr
      totalNetPayoutInr
      items {
        orderItemId
        studentName
        classesInBooking
        rateInr
        concludedInRange
        grossInr
        commissionPercent
        commissionInr
        onlineChargesInr
        paymentGatewayProvider
        paymentGatewayFeeInr
        paymentGatewayGstInr
        paymentGatewayChargesInr
        totalDeductionsInr
        netPayoutInr
      }
    }
  }
`;

export const MY_TUTOR_PAYOUT_TRANSFERS = gql`
  query MyTutorPayoutTransfers {
    myTutorPayoutTransfers {
      id
      paidAt
      amountInr
      bankAccountLast4
      utrReference
    }
  }
`;
