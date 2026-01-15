import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { useMutation } from '@apollo/client';
import { LOGIN } from '@tutorix/shared-graphql/mutations';
import { getPhoneCountryCode } from '@tutorix/shared-graphql/utils';
import { setAuthToken } from '@tutorix/shared-graphql/client/shared';
import { BRAND_NAME } from '../config';

type LoginScreenProps = {
  onLoginSuccess?: () => void;
  onForgotPassword?: () => void;
};

type IncompleteSignupError = {
  message: string;
  userId: number;
  isMobileVerified: boolean;
  isEmailVerified: boolean;
};

export const LoginScreen: React.FC<LoginScreenProps> = ({ onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [countryCode] = useState('IN');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [errors, setErrors] = useState<{
    email?: string;
    mobile?: string;
    password?: string;
    general?: string;
  }>({});

  const [login, { loading }] = useMutation(LOGIN, {
    onCompleted: async (data) => {
      try {
        // Store access token
        if (data.login?.accessToken) {
          await setAuthToken(data.login.accessToken);
        }
        console.log('Login successful:', data.login?.user);
        setShowSuccessModal(true);
        if (successTimerRef.current) {
          clearTimeout(successTimerRef.current);
        }
        successTimerRef.current = setTimeout(() => {
          setShowSuccessModal(false);
        }, 2000);
        
      } catch (error) {
        console.error('Error storing token:', error);
        setErrors({ general: 'Login successful but failed to save session' });
      }
    },
    onError: (error) => {
      console.error('Login error:', error);
      
      // Try to parse incomplete signup error
      try {
        const errorMessage = error.message || '';
        if (errorMessage.includes('Please complete your signup')) {
          const jsonMatch = errorMessage.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const errorData = JSON.parse(jsonMatch[0]) as IncompleteSignupError;
              if (errorData.userId !== undefined) {
                Alert.alert(
                  'Complete Signup',
                  'Please complete your signup process before logging in.',
                  [{ text: 'OK' }]
                );
                return;
              }
            } catch {
              // Continue with general error handling
            }
          }
        }
      } catch {
        // Continue with general error handling
      }
      
      // Handle other errors
      if (error.message.includes('Invalid login credentials')) {
        setErrors({ general: 'Invalid email/mobile number or password. Please try again.' });
      } else if (error.message.includes('Account is inactive')) {
        setErrors({ general: 'Your account is inactive. Please contact support.' });
      } else {
        setErrors({ general: error.message || 'Login failed. Please try again.' });
      }
    },
  });

  const validateForm = (): boolean => {
    const newErrors: { email?: string; mobile?: string; password?: string } = {};
    
    const hasEmail = email.trim().length > 0;
    const hasMobile = mobile.trim().length > 0;
    
    if (!hasEmail && !hasMobile) {
      newErrors.email = 'Please enter either email or mobile number';
      newErrors.mobile = 'Please enter either email or mobile number';
    } else if (hasEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }
    } else if (hasMobile) {
      const digitsOnly = mobile.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        newErrors.mobile = 'Please enter a valid mobile number (at least 10 digits)';
      }
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    setErrors({});
    
    if (!validateForm()) {
      return;
    }
    
    try {
      const loginId = email.trim()
        ? email.trim()
        : `${getPhoneCountryCode(countryCode)}${mobile.replace(/\D/g, '')}`;
      
      await login({
        variables: {
          input: {
            loginId,
            password,
          },
        },
      });
    } catch {
      // Error handling is done in onError callback
    }
  };

  const handleMobileChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    setMobile(digitsOnly);
    if (!email.trim()) {
      setErrors((prev) => ({ ...prev, mobile: undefined, general: undefined }));
    }
  };

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>{BRAND_NAME} • Login</Text>
          <Text style={styles.subtitle}>
            Enter your registered email or mobile number and password to continue
          </Text>

          {errors.general && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setErrors((prev) => ({ ...prev, email: undefined, mobile: undefined, general: undefined }));
              }}
              placeholder="Enter your registered Email"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            {errors.email && <Text style={styles.fieldError}>{errors.email}</Text>}
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile Number</Text>
            <View style={styles.mobileRow}>
              <View style={styles.countryCodeContainer}>
                <Text style={styles.countryCodeText}>
                  {countryCode === 'IN' ? '+91' : countryCode === 'US' ? '+1' : '+91'}
                </Text>
              </View>
              <TextInput
                style={[styles.input, styles.mobileInput, errors.mobile && styles.inputError]}
                value={mobile}
                onChangeText={handleMobileChange}
                placeholder="Enter your mobile number"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                maxLength={10}
                editable={!loading}
              />
            </View>
            {errors.mobile && <Text style={styles.fieldError}>{errors.mobile}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setErrors((prev) => ({ ...prev, password: undefined, general: undefined }));
                }}
                placeholder="Enter your password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.showPasswordButton}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <Text style={styles.showPasswordText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}
            {onForgotPassword && (
              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={onForgotPassword}
                disabled={loading}
              >
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal transparent visible={showSuccessModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Login Successful</Text>
            <Text style={styles.modalMessage}>
              You have logged in successfully.
            </Text>
          </View>
        </View>
      </Modal>
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  mobileRow: {
    flexDirection: 'row',
    gap: 8,
  },
  countryCodeContainer: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    minWidth: 60,
  },
  countryCodeText: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  mobileInput: {
    flex: 1,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 60,
  },
  showPasswordButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  showPasswordText: {
    color: '#1d4ed8',
    fontSize: 14,
    fontWeight: '500',
  },
  forgotPasswordButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
});
