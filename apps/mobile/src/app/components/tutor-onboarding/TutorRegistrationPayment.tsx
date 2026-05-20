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

type Props = {
  onComplete: () => void;
  onBack?: () => void;
};

export const TutorRegistrationPayment: React.FC<Props> = ({
  onComplete,
  onBack,
}) => {
  const [errorText, setErrorText] = useState<string | null>(null);
  const [completeStep, { loading }] = useMutation(
    COMPLETE_REGISTRATION_PAYMENT_STEP,
    {
      refetchQueries: [{ query: GET_MY_TUTOR_PROFILE }],
    },
  );

  const handleContinue = async () => {
    setErrorText(null);
    try {
      await completeStep();
      onComplete();
    } catch {
      setErrorText('Could not advance to documents. Try again or contact support.');
    }
  };

  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>
        Pay your registration fee. This step will be implemented soon.
      </Text>
      {errorText ? (
        <Text style={styles.errorText}>{errorText}</Text>
      ) : null}
      <View style={styles.placeholderButtons}>
        {onBack && (
          <TouchableOpacity
            style={styles.placeholderBack}
            onPress={onBack}
            activeOpacity={0.7}
            disabled={loading}
          >
            <Text style={styles.placeholderBackText}>Back</Text>
          </TouchableOpacity>
        )}
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
  placeholderText: {
    fontSize: 16,
    color: '#64748b',
  },
  errorText: {
    fontSize: 14,
    color: '#b91c1c',
  },
  placeholderButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  placeholderBack: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
  },
  placeholderBackText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
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
