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
import Svg, { Path, Circle } from 'react-native-svg';
import { useMutation } from '@apollo/client';
import { LOGIN, REFRESH_TOKEN } from '@tutorix/shared-graphql/mutations';
import { getPhoneCountryCode } from '@tutorix/shared-graphql/utils';
import { setAuthToken } from '@tutorix/shared-graphql/client/shared';
import { BRAND_NAME } from '../config';
import { AnalyticsEvent } from '@tutorix/analytics';
import { trackEvent } from '../../lib/analytics';
import {
  getBiometricToken,
  getSupportedBiometryType,
  hasBiometricToken,
  saveBiometricToken,
} from '../lib/biometric-auth';

type LoginScreenProps = {
  onLoginSuccess?: () => void;
  onForgotPassword?: () => void;
  onSignUp?: (userId?: number, verificationStatus?: { isMobileVerified: boolean; isEmailVerified: boolean }) => void;
};

type IncompleteSignupError = {
  message: string;
  userId: number;
  isMobileVerified: boolean;
  isEmailVerified: boolean;
};

const COUNTRY_OPTIONS = [
  { code: 'IN', label: 'IND (+91)' },
  { code: 'US', label: 'US (+1)' },
  { code: 'GB', label: 'UK (+44)' },
  { code: 'AU', label: 'AUS (+61)' },
];

export const LoginScreen: React.FC<LoginScreenProps> = ({ onForgotPassword, onSignUp }) => {
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('IN');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loginMethodRef = useRef<'email' | 'mobile' | 'biometric' | 'unknown'>('unknown');
  const [biometryType, setBiometryType] = useState<'FaceID' | 'TouchID' | 'Biometrics' | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
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
        trackEvent(AnalyticsEvent.USER_LOGIN, {
          method: loginMethodRef.current,
          platform: Platform.OS,
          success: true,
        });
        showLoginSuccess(data.login?.refreshToken);
        
      } catch (error) {
        console.error('Error storing token:', error);
        setErrors({ general: 'Login successful but failed to save session' });
      }
    },
    onError: (error) => {
      console.error('Login error:', error);
      trackEvent(AnalyticsEvent.USER_LOGIN, {
        method: loginMethodRef.current ?? 'unknown',
        platform: Platform.OS,
        success: false,
        error_message: error.message,
      });
      
      // Try to parse incomplete signup error
      try {
        const errorMessage = error.message || '';
        if (errorMessage.includes('Please complete your signup')) {
          const jsonMatch = errorMessage.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const errorData = JSON.parse(jsonMatch[0]) as IncompleteSignupError;
              if (errorData.userId !== undefined) {
                Alert.alert('Complete Signup', 'Please complete your signup process before logging in.', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Complete Signup',
                    onPress: () => {
                      onSignUp?.(errorData.userId, {
                        isMobileVerified: errorData.isMobileVerified,
                        isEmailVerified: errorData.isEmailVerified,
                      });
                    },
                  },
                ]);
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

  const [refreshTokenMutation] = useMutation(REFRESH_TOKEN);

  const showLoginSuccess = (refreshToken?: string) => {
    setShowSuccessModal(true);
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }
    successTimerRef.current = setTimeout(() => {
      setShowSuccessModal(false);
      if (refreshToken) {
        maybePromptEnableBiometrics(refreshToken);
      }
    }, 2000);
  };

  const maybePromptEnableBiometrics = (refreshToken: string) => {
    if (!biometryType || biometricEnabled) {
      return;
    }
    const label =
      biometryType === 'FaceID'
        ? 'Face ID'
        : biometryType === 'TouchID'
        ? 'Touch ID'
        : 'Biometrics';
    Alert.alert(`Enable ${label}?`, `Use ${label} to login faster next time.`, [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Enable',
        onPress: async () => {
          await saveBiometricToken(refreshToken);
          setBiometricEnabled(true);
        },
      },
    ]);
  };

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
      loginMethodRef.current = email.trim() ? 'email' : 'mobile';
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

  const handleBiometricLogin = async () => {
    if (!biometryType || biometricLoading) {
      return;
    }
    setErrors({});
    setBiometricLoading(true);
    loginMethodRef.current = 'biometric';
    try {
      const label =
        biometryType === 'FaceID'
          ? 'Face ID'
          : biometryType === 'TouchID'
          ? 'Touch ID'
          : 'Biometrics';
      const storedRefreshToken = await getBiometricToken(`Login with ${label}`);
      if (!storedRefreshToken) {
        trackEvent(AnalyticsEvent.USER_LOGIN, {
          method: 'biometric',
          platform: Platform.OS,
          success: false,
          error_message: 'Biometric auth cancelled or no token stored',
        });
        setErrors({ general: 'Biometric login cancelled or unavailable.' });
        return;
      }
      const { data } = await refreshTokenMutation({
        variables: { refreshToken: storedRefreshToken },
      });
      if (data?.refreshToken?.accessToken) {
        await setAuthToken(data.refreshToken.accessToken);
        if (data.refreshToken.refreshToken) {
          await saveBiometricToken(data.refreshToken.refreshToken);
        }
        trackEvent(AnalyticsEvent.USER_LOGIN, {
          method: 'biometric',
          platform: Platform.OS,
          success: true,
        });
        showLoginSuccess();
      } else {
        throw new Error('Failed to refresh session');
      }
    } catch (error) {
      trackEvent(AnalyticsEvent.USER_LOGIN, {
        method: 'biometric',
        platform: Platform.OS,
        success: false,
        error_message: error instanceof Error ? error.message : 'Biometric login failed',
      });
      setErrors({ general: 'Biometric login failed. Please try again.' });
    } finally {
      setBiometricLoading(false);
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

  useEffect(() => {
    let mounted = true;
    const loadBiometricState = async () => {
      const type = await getSupportedBiometryType();
      if (!mounted) return;
      setBiometryType(type);
      if (type) {
        const hasToken = await hasBiometricToken();
        if (!mounted) return;
        setBiometricEnabled(hasToken);
      }
    };
    loadBiometricState();
    return () => {
      mounted = false;
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
              <TouchableOpacity
                style={styles.countryCodeContainer}
                onPress={() => setShowCountryModal(true)}
                disabled={loading}
              >
                <Text style={styles.countryCodeText}>
                  {COUNTRY_OPTIONS.find((c) => c.code === countryCode)?.label || 'Select'}
                </Text>
              </TouchableOpacity>
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
                {showPassword ? (
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#1d4ed8">
                    <Path
                      d="M3 3 21 21"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                    />
                    <Path
                      d="M10.6 10.6a3 3 0 0 0 4.8 3.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                    />
                    <Path
                      d="M9.9 4.2A9.53 9.53 0 0 1 12 4c5 0 9 4.5 9.5 8-.12.79-.61 1.93-1.54 3.07M6.3 6.3C4.3 7.67 3 9.64 2.5 12c.27 1.31 1.07 2.84 2.36 4.17A11.88 11.88 0 0 0 12 20c1.14 0 2.24-.17 3.28-.52"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                    />
                  </Svg>
                ) : (
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#1d4ed8">
                    <Path
                      d="M1.5 12C2.5 8.5 6.5 4 12 4s9.5 4.5 10.5 8c-1 3.5-5 8-10.5 8S2.5 15.5 1.5 12Z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                    />
                    <Circle cx="12" cy="12" r="3" strokeWidth={1.8} />
                  </Svg>
                )}
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

          {biometryType && biometricEnabled && (
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometricLogin}
              disabled={loading || biometricLoading}
            >
              {biometricLoading ? (
                <ActivityIndicator color="#1d4ed8" />
              ) : (
                <Text style={styles.biometricButtonText}>
                  Login with{' '}
                  {biometryType === 'FaceID'
                    ? 'Face ID'
                    : biometryType === 'TouchID'
                    ? 'Touch ID'
                    : 'Biometrics'}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {onSignUp && (
            <TouchableOpacity
              style={styles.signupButton}
              onPress={() => onSignUp()}
              disabled={loading}
            >
              <Text style={styles.signupText}>Don't have an account? Sign up</Text>
            </TouchableOpacity>
          )}
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

      <Modal transparent visible={showCountryModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.countryModalCard}>
            <Text style={styles.countryModalTitle}>Select Country</Text>
            {COUNTRY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.code}
                style={styles.countryOption}
                onPress={() => {
                  setCountryCode(option.code);
                  setShowCountryModal(false);
                }}
              >
                <Text style={styles.countryOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.countryModalClose}
              onPress={() => setShowCountryModal(false)}
            >
              <Text style={styles.countryModalCloseText}>Cancel</Text>
            </TouchableOpacity>
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
    width: 120,
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
  biometricButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  biometricButtonText: {
    color: '#1d4ed8',
    fontSize: 14,
    fontWeight: '600',
  },
  signupButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  signupText: {
    color: '#1d4ed8',
    fontSize: 14,
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
  countryModalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  countryModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  countryOption: {
    paddingVertical: 10,
  },
  countryOptionText: {
    fontSize: 14,
    color: '#1e293b',
  },
  countryModalClose: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  countryModalCloseText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
});
