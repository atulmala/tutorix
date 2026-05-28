import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useMutation } from '@apollo/client';
import {
  ACKNOWLEDGE_ONBOARDING_CELEBRATION,
} from '@tutorix/shared-graphql/mutations';
import { GET_MY_TUTOR_PROFILE } from '@tutorix/shared-graphql/queries';
import { ONBOARDING_APPROVED_MESSAGE } from '@tutorix/shared-utils';

type Props = {
  onGoToDashboard?: () => void;
};

export const TutorOnboardingComplete: React.FC<Props> = ({ onGoToDashboard }) => {
  const [error, setError] = useState<string | null>(null);
  const [acknowledge, { loading }] = useMutation(
    ACKNOWLEDGE_ONBOARDING_CELEBRATION,
    {
      refetchQueries: [{ query: GET_MY_TUTOR_PROFILE }],
      awaitRefetchQueries: true,
    },
  );

  const handleGoToDashboard = async () => {
    setError(null);
    try {
      await acknowledge();
      onGoToDashboard?.();
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : 'Could not continue. Please try again.';
      setError(message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>{ONBOARDING_APPROVED_MESSAGE}</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={() => void handleGoToDashboard()}
        disabled={loading}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Go to your dashboard</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 16,
  },
  banner: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bannerText: {
    fontSize: 14,
    color: '#14532d',
    lineHeight: 20,
  },
  error: {
    fontSize: 14,
    color: '#b91c1c',
  },
  button: {
    alignSelf: 'flex-end',
    backgroundColor: '#5fa8ff',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 180,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
