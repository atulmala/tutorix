import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useMutation } from '@apollo/client';
import { GET_MY_STUDENT_PROFILE } from '@tutorix/shared-graphql/queries';
import { SAVE_STUDENT_PARENT_STEP } from '@tutorix/shared-graphql/mutations';

export const StudentParentStep: React.FC = () => {
  const [parentRelation, setParentRelation] = useState<'FATHER' | 'MOTHER'>('FATHER');
  const [parentName, setParentName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [saveParent, { loading }] = useMutation(SAVE_STUDENT_PARENT_STEP, {
    refetchQueries: [{ query: GET_MY_STUDENT_PROFILE }],
    awaitRefetchQueries: true,
    onError: (err) => {
      setError(
        err.graphQLErrors?.[0]?.message ||
          err.message ||
          'Failed to save. Please try again.',
      );
    },
  });

  const handleSubmit = async () => {
    setError(null);
    if (!parentName.trim()) {
      setError('Parent name is required');
      return;
    }
    await saveParent({
      variables: {
        input: { parentRelation, parentName: parentName.trim() },
      },
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>
          Please provide details for one parent or guardian.
        </Text>

        <Text style={styles.label}>
          Relationship <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.radioRow}>
          {(['FATHER', 'MOTHER'] as const).map((value) => (
            <TouchableOpacity
              key={value}
              style={styles.radioOption}
              onPress={() => setParentRelation(value)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.radioOuter,
                  parentRelation === value && styles.radioOuterSelected,
                ]}
              >
                {parentRelation === value && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>
                {value === 'FATHER' ? 'Father' : 'Mother'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>
          Name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[
            styles.input,
            !!error && !parentName.trim() && styles.inputError,
          ]}
          value={parentName}
          onChangeText={setParentName}
          placeholder="Enter parent or guardian name"
          placeholderTextColor="#9ca3af"
          editable={!loading}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.continueButton, loading && styles.continueButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.continueButtonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
    padding: 24,
  },
  hint: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#143055',
    marginBottom: 8,
  },
  required: {
    color: '#dc2626',
  },
  radioRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 20,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#5fa8ff',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#5fa8ff',
  },
  radioLabel: {
    fontSize: 14,
    color: '#143055',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#143055',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  inputError: {
    borderColor: '#dc2626',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  continueButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#5fa8ff',
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(95, 168, 255, 0.4)',
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
