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
import { BRAND_NAME } from '../config';
import { FORGOT_PASSWORD } from '@tutorix/shared-graphql/mutations';

type ForgotPasswordScreenProps = {
  onBackToLogin: () => void;
};

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ email?: string; general?: string }>({});
  const [submitted, setSubmitted] = useState(false);

  const [forgotPassword, { loading }] = useMutation(FORGOT_PASSWORD, {
    onCompleted: () => {
      setSubmitted(true);
    },
    onError: (error) => {
      console.error('Forgot password error:', error);
      // Always show success (security: don't reveal if email exists)
      setSubmitted(true);
    },
  });

  const validateEmail = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value.trim())) {
      return 'Please enter a valid email address';
    }
    return undefined;
  };

  const handleSubmit = async () => {
    setErrors({});
    const emailError = validateEmail(email);
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }

    try {
      await forgotPassword({
        variables: {
          input: {
            email: email.trim(),
          },
        },
      });
    } catch {
      // Error handling is done in onError callback
      setSubmitted(true);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {submitted ? (
            <>
              <Text style={styles.title}>{BRAND_NAME} • Password Reset</Text>
              <View style={styles.successContainer}>
                <Text style={styles.successTitle}>Check your email</Text>
                <Text style={styles.successText}>
                  If an account with the email <Text style={styles.bold}>{email}</Text> exists,
                  we&apos;ve sent you a password reset link.
                </Text>
                <Text style={styles.successText}>
                  Please check your inbox and click on the link to reset your password. The link
                  will expire in 1 hour.
                </Text>
              </View>
              <TouchableOpacity style={styles.primaryButton} onPress={onBackToLogin}>
                <Text style={styles.primaryButtonText}>Back to Login</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>{BRAND_NAME} • Forgot Password</Text>
              <Text style={styles.subtitle}>
                Enter your email address and we&apos;ll send you a link to reset your password.
              </Text>

              {errors.general && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errors.general}</Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    setErrors((prev) => ({ ...prev, email: undefined, general: undefined }));
                  }}
                  placeholder="your@email.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                {errors.email && <Text style={styles.fieldError}>{errors.email}</Text>}
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading || !email.trim()}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkButton} onPress={onBackToLogin} disabled={loading}>
                <Text style={styles.linkButtonText}>Back to Login</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#f87171',
    backgroundColor: '#fef2f2',
  },
  fieldError: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#1d4ed8',
    fontSize: 14,
    fontWeight: '600',
  },
  successContainer: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  successTitle: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  successText: {
    color: '#166534',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  bold: {
    fontWeight: '700',
  },
});
