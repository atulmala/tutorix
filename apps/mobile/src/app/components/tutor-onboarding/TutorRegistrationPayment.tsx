import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useMutation } from '@apollo/client';
import {
  COMPLETE_REGISTRATION_PAYMENT_STEP,
} from '@tutorix/shared-graphql/mutations';
import { GET_MY_TUTOR_PROFILE } from '@tutorix/shared-graphql/queries';
import { REGISTRATION_FEE_WAIVED_MESSAGE } from '@tutorix/shared-utils';

type Props = {
  onComplete: () => void;
};

export const TutorRegistrationPayment: React.FC<Props> = () => {
  const [errorText, setErrorText] = useState<string | null>(null);
  const [completeStep, { loading }] = useMutation(
    COMPLETE_REGISTRATION_PAYMENT_STEP,
    {
      refetchQueries: [{ query: GET_MY_TUTOR_PROFILE }],
      awaitRefetchQueries: true,
    },
  );

  const handleContinue = async () => {
    setErrorText(null);
    try {
      await completeStep();
      // Don't call onComplete — refetch updates profileData; useEffect syncs step index.
    } catch {
      setErrorText('Could not advance to documents. Try again or contact support.');
    }
  };

  return (
    <View style={styles.placeholder}>
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerText}>{REGISTRATION_FEE_WAIVED_MESSAGE}</Text>
        <Text style={styles.infoBannerSubtext}>No payment is required right now.</Text>
      </View>
      {errorText ? (
        <Text style={styles.errorText}>{errorText}</Text>
      ) : null}
      <View style={styles.placeholderButtons}>
        <TouchableOpacity
          style={styles.placeholderContinue}
          onPress={handleContinue}
          activeOpacity={0.7}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.placeholderContinueText}>Continue</Text>
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
