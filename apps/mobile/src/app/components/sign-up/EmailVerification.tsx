import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useMutation } from '@apollo/client';
import { GENERATE_EMAIL_OTP, VERIFY_EMAIL_OTP } from '@tutorix/shared-graphql/mutations';
import { trackEvent } from '../../../lib/analytics';
import { AnalyticsEvent } from '@tutorix/analytics';
import { OtpInputRow } from '../OtpInputRow';

type EmailVerificationProps = {
  userId: number;
  onVerified: () => void;
  disabled?: boolean;
  initialEmail?: string;
  onBackToDetails?: () => void;
};

export const EmailVerification: React.FC<EmailVerificationProps> = ({
  userId,
  onVerified,
  disabled = false,
  initialEmail,
}) => {
  const [email, setEmail] = useState(initialEmail ?? '');
  const [emailError, setEmailError] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [verified, setVerified] = useState(false);
  const otpRequestTimeRef = useRef<number | null>(null);
  const resendCountRef = useRef<number>(0);

  const [generateOtp, { loading: isGeneratingOtp }] = useMutation(GENERATE_EMAIL_OTP, {
    onError: (error) => {
      setOtpError(error.message || 'Failed to send OTP. Please try again.');
      setOtpRequested(false);
    },
  });

  const [verifyOtp, { loading: isVerifyingOtp }] = useMutation(VERIFY_EMAIL_OTP, {
    onError: (error) => {
      setOtpError(error.message || 'Invalid OTP. Please try again.');
      setOtp('');
    },
  });

  useEffect(() => {
    if (initialEmail !== undefined) {
      setEmail(initialEmail);
      setOtp('');
      setOtpRequested(false);
      setVerified(false);
      otpRequestTimeRef.current = null;
      resendCountRef.current = 0;
    }
  }, [initialEmail]);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    setEmailError(valid || value.length === 0 ? '' : 'Enter a valid email');
    setVerified(false);
  };

  const handleOtpChange = (value: string) => {
    setOtp(value);
    setOtpError('');
  };

  const requestOtp = async () => {
    if (disabled) return;
    if (email && !emailError) {
      setOtpError('');
      const isResend = otpRequested;
      try {
        await generateOtp({
          variables: { userId },
        });
        setOtpRequested(true);
        setOtp('');
        setResendTimer(60);
        setVerified(false);
        otpRequestTimeRef.current = Date.now();

        if (isResend) {
          resendCountRef.current += 1;
          trackEvent(AnalyticsEvent.OTP_RESEND_REQUESTED, {
            user_id: userId,
            verification_type: 'email',
            resend_count: resendCountRef.current,
          });
        } else {
          trackEvent(AnalyticsEvent.OTP_REQUESTED, {
            user_id: userId,
            verification_type: 'email',
          });
        }
      } catch {
        // handled by onError
      }
    }
  };

  const verify = async () => {
    if (disabled) return;
    if (otpRequested && otp && !otpError && otp.length === 6) {
      setOtpError('');
      const verificationStartTime = Date.now();
      const timeSinceOtpRequest = otpRequestTimeRef.current
        ? Math.round((verificationStartTime - otpRequestTimeRef.current) / 1000)
        : 0;

      try {
        const { data } = await verifyOtp({
          variables: {
            userId,
            otp,
            timestamp: new Date().toISOString(),
          },
        });

        if (data?.verifyOtp?.success) {
          const verificationDuration = Math.round((Date.now() - verificationStartTime) / 1000);
          trackEvent(AnalyticsEvent.OTP_VERIFICATION_ATTEMPTED, {
            user_id: userId,
            verification_type: 'email',
            success: true,
            time_since_otp_request_seconds: timeSinceOtpRequest,
            verification_duration_seconds: verificationDuration,
            resend_count: resendCountRef.current,
          });
          setVerified(true);
          onVerified();
        } else {
          trackEvent(AnalyticsEvent.OTP_VERIFICATION_FAILED, {
            user_id: userId,
            verification_type: 'email',
            failure_reason: data?.verifyOtp?.message || 'Invalid OTP',
            time_since_otp_request_seconds: timeSinceOtpRequest,
            resend_count: resendCountRef.current,
          });
          trackEvent(AnalyticsEvent.OTP_VERIFICATION_ATTEMPTED, {
            user_id: userId,
            verification_type: 'email',
            success: false,
            time_since_otp_request_seconds: timeSinceOtpRequest,
            resend_count: resendCountRef.current,
          });
          setOtpError(data?.verifyOtp?.message || 'Verification failed. Please try again.');
          setOtp('');
        }
      } catch (error) {
        trackEvent(AnalyticsEvent.OTP_VERIFICATION_FAILED, {
          user_id: userId,
          verification_type: 'email',
          failure_reason: error instanceof Error ? error.message : 'Network error',
          time_since_otp_request_seconds: timeSinceOtpRequest,
          resend_count: resendCountRef.current,
        });
        trackEvent(AnalyticsEvent.OTP_VERIFICATION_ATTEMPTED, {
          user_id: userId,
          verification_type: 'email',
          success: false,
          time_since_otp_request_seconds: timeSinceOtpRequest,
          resend_count: resendCountRef.current,
        });
      }
    }
  };

  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => {
      setResendTimer((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Verify Email</Text>
        {verified && <Text style={styles.verifiedTag}>Verified</Text>}
      </View>
      <Text style={styles.subtitle}>We will send a 6 digit OTP to verify your email.</Text>

      <View style={styles.row}>
        <TextInput
          style={[styles.input, emailError && styles.inputError]}
          value={email}
          onChangeText={handleEmailChange}
          placeholder="Enter email"
          placeholderTextColor="#9ca3af"
          keyboardType="email-address"
          editable={false}
        />
        <TouchableOpacity
          style={[styles.otpButton, (disabled || !email || emailError || isGeneratingOtp) && styles.buttonDisabled]}
          disabled={disabled || !email || emailError !== '' || isGeneratingOtp}
          onPress={requestOtp}
        >
          {isGeneratingOtp ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.otpButtonText}>Get OTP</Text>
          )}
        </TouchableOpacity>
      </View>
      {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

      <View style={styles.otpSection}>
        <OtpInputRow value={otp} onChange={handleOtpChange} disabled={disabled || !otpRequested} error={otpError} />
        <Text style={styles.helperText}>Enter 6 digit OTP you received on your email</Text>
        {otpError ? <Text style={styles.errorText}>{otpError}</Text> : null}
        <TouchableOpacity
          style={[styles.verifyButton, (disabled || !otpRequested || otp.length !== 6 || otpError || isVerifyingOtp) && styles.buttonDisabled]}
          disabled={disabled || !otpRequested || !otp || otpError !== '' || otp.length !== 6 || isVerifyingOtp}
          onPress={verify}
        >
          {isVerifyingOtp ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify OTP</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.resendText}>
          Did not receive OTP?{' '}
          <Text
            style={styles.resendLink}
            onPress={resendTimer > 0 || isGeneratingOtp || disabled ? undefined : requestOtp}
          >
            {resendTimer > 0 ? `Resend in 0:${resendTimer.toString().padStart(2, '0')}` : 'Resend'}
          </Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  verifiedTag: {
    fontSize: 12,
    color: '#15803d',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#f87171',
    backgroundColor: '#fef2f2',
  },
  otpButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  otpButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  otpSection: {
    gap: 10,
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
  },
  verifyButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  resendText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  resendLink: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
