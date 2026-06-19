import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import {
  COMPLETE_STUDENT_REGISTRATION_PAYMENT_STEP,
  CONFIRM_PLATFORM_FEE_PAYMENT,
  GET_MY_STUDENT_PROFILE,
  GET_PLATFORM_FEE,
  INITIATE_PLATFORM_FEE_PAYMENT,
} from '@tutorix/shared-graphql';
import {
  formatPlatformFeeSummary,
  openPaymentCheckout,
  type PaymentOrderSession,
} from '@tutorix/shared-utils';
import type { StudentStepComponentProps } from './types';

export const StudentRegistrationPayment: React.FC<StudentStepComponentProps> = ({
  onComplete,
}) => {
  const [errorText, setErrorText] = useState<string | null>(null);
  const { data: feeData, loading: feeLoading } = useQuery(GET_PLATFORM_FEE, {
    variables: { code: 'STUDENT_REGISTRATION' },
  });
  const fee = feeData?.platformFee;
  const summary = fee ? formatPlatformFeeSummary(fee) : null;

  const [initiatePayment] = useMutation(INITIATE_PLATFORM_FEE_PAYMENT);
  const [confirmPayment] = useMutation(CONFIRM_PLATFORM_FEE_PAYMENT);
  const [completeStep, { loading: completing }] = useMutation(
    COMPLETE_STUDENT_REGISTRATION_PAYMENT_STEP,
    {
      refetchQueries: [{ query: GET_MY_STUDENT_PROFILE }],
      awaitRefetchQueries: true,
      onCompleted: () => onComplete(),
    },
  );

  const handleContinue = async () => {
    setErrorText(null);
    try {
      const initiateResult = await initiatePayment({
        variables: { feeCode: 'STUDENT_REGISTRATION' },
      });
      const session = initiateResult.data
        ?.initiatePlatformFeePayment as PaymentOrderSession;

      if (session && !session.skipped) {
        const confirmation = await openPaymentCheckout(session);
        await confirmPayment({
          variables: {
            input: {
              feeCode: 'STUDENT_REGISTRATION',
              provider: confirmation.provider,
              orderId: confirmation.orderId,
              paymentId: confirmation.paymentId,
              signature: confirmation.signature,
            },
          },
        });
      }

      await completeStep();
    } catch (error) {
      setErrorText(
        error instanceof Error
          ? error.message
          : 'Could not complete registration payment. Try again or contact support.',
      );
    }
  };

  const loading = feeLoading || completing;

  return (
    <View style={styles.container}>
      {fee ? (
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerTitle}>{summary?.title}</Text>
          <Text style={styles.infoBannerText}>
            List price: ₹{fee.amountInr}
            {fee.discountAmountInr > 0
              ? ` · Discount: ₹${fee.discountAmountInr}`
              : ''}
            {fee.effectiveAmountInr <= 0
              ? ' · No payment required'
              : ` · Amount due: ₹${fee.effectiveAmountInr}`}
          </Text>
          {summary?.message ? (
            <Text style={styles.infoBannerSubtext}>{summary.message}</Text>
          ) : null}
        </View>
      ) : null}
      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
      <TouchableOpacity
        style={styles.button}
        onPress={() => void handleContinue()}
        disabled={loading || !fee}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {summary?.requiresPayment
              ? `Pay ₹${fee?.effectiveAmountInr ?? ''}`
              : 'Continue'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 16 },
  infoBanner: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  infoBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#451a03',
  },
  infoBannerText: { fontSize: 14, color: '#451a03', lineHeight: 20 },
  infoBannerSubtext: { fontSize: 14, color: '#78350f', lineHeight: 20 },
  errorText: { fontSize: 14, color: '#b91c1c' },
  button: {
    alignSelf: 'flex-end',
    minWidth: 120,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#5fa8ff',
    alignItems: 'center',
  },
  buttonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
