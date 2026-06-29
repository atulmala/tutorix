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
  GET_MY_TUTOR_PROFILE,
  GET_PLATFORM_FEE,
} from '@tutorix/shared-graphql/queries';
import {
  COMPLETE_REGISTRATION_PAYMENT_STEP,
  CONFIRM_PLATFORM_FEE_PAYMENT,
  INITIATE_PLATFORM_FEE_PAYMENT,
} from '@tutorix/shared-graphql/mutations';
import {
  formatPlatformFeeSummary,
  openPaymentCheckout,
  checkoutSession,
  type CheckoutResult,
} from '@tutorix/shared-utils';

type Props = {
  onComplete: () => void;
};

export const TutorRegistrationPayment: React.FC<Props> = () => {
  const [errorText, setErrorText] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const { data: feeData, loading: feeLoading } = useQuery(GET_PLATFORM_FEE, {
    variables: { code: 'TUTOR_REGISTRATION' },
  });
  const fee = feeData?.platformFee;
  const summary = fee ? formatPlatformFeeSummary(fee) : null;
  const feeMessage = summary?.message ?? fee?.promoMessage?.trim() ?? null;

  const [initiatePayment] = useMutation(INITIATE_PLATFORM_FEE_PAYMENT);
  const [confirmPayment] = useMutation(CONFIRM_PLATFORM_FEE_PAYMENT);
  const [completeStep, { loading: completing }] = useMutation(
    COMPLETE_REGISTRATION_PAYMENT_STEP,
    {
      refetchQueries: [{ query: GET_MY_TUTOR_PROFILE }],
      awaitRefetchQueries: true,
    },
  );

  const handleContinue = async () => {
    setErrorText(null);
    if (summary?.requiresPayment) {
      setErrorText(
        'Paid registration is temporarily available on the web only. Please complete this step on the Tutorix website.',
      );
      return;
    }
    try {
      const initiateResult = await initiatePayment({
        variables: { feeCode: 'TUTOR_REGISTRATION' },
      });
      const checkout = initiateResult.data
        ?.initiatePlatformFeePayment as CheckoutResult;
      setOrderNumber(checkout?.order?.orderNumber ?? null);
      const session = checkoutSession(checkout);

      if (!session.skipped) {
        const confirmation = await openPaymentCheckout(session);
        await confirmPayment({
          variables: {
            input: {
              feeCode: 'TUTOR_REGISTRATION',
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
    <View style={styles.placeholder}>
      {fee ? (
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerTitle}>
            {summary?.title ?? fee.displayName}
          </Text>
          {feeMessage ? (
            <Text style={styles.infoBannerSubtext}>{feeMessage}</Text>
          ) : null}
          {orderNumber ? (
            <Text style={styles.infoBannerSubtext}>Order {orderNumber}</Text>
          ) : null}
        </View>
      ) : null}
      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
      <View style={styles.placeholderButtons}>
        <TouchableOpacity
          style={styles.placeholderContinue}
          onPress={() => void handleContinue()}
          activeOpacity={0.7}
          disabled={loading || !fee}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.placeholderContinueText}>
              {summary?.requiresPayment
                ? `Pay ₹${fee?.effectiveAmountInr ?? ''}`
                : 'Continue'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 16,
  },
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
  infoBannerText: {
    fontSize: 14,
    color: '#451a03',
    lineHeight: 20,
  },
  infoBannerSubtext: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#b91c1c',
  },
  placeholderButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  placeholderContinue: {
    minWidth: 120,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#5fa8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderContinueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
