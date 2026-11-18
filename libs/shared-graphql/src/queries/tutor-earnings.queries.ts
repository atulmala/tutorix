import { gql } from '@apollo/client';

const TUTOR_MONTHLY_EARNINGS_BUCKET = gql`
  fragment TutorMonthlyEarningsBucket on TutorMonthlyEarningsBucket {
    concludedClassCount
    totalNetPayoutInr
  }
`;

export const MY_TUTOR_EARNINGS_SUMMARY = gql`
  query MyTutorEarningsSummary {
    myTutorEarningsSummary {
      bankDetailsComplete
      year
      month
      payable {
        concludedClassCount
        totalNetPayoutInr
      }
      deferred {
        concludedClassCount
        totalNetPayoutInr
      }
      deferredNote
    }
  }
`;

export const MY_TUTOR_MONTHLY_EARNINGS = gql`
  ${TUTOR_MONTHLY_EARNINGS_BUCKET}
  query MyTutorMonthlyEarnings($input: TutorPayoutMonthInput!) {
    myTutorMonthlyEarnings(input: $input) {
      monthLabel
      startDate
      endDate
      settlementDayOfMonth
      settlementNote
      payable {
        ...TutorMonthlyEarningsBucket
      }
      inDisputeWindow {
        ...TutorMonthlyEarningsBucket
      }
      underDispute {
        ...TutorMonthlyEarningsBucket
      }
      carriedForward {
        ...TutorMonthlyEarningsBucket
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