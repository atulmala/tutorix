import React, { useEffect, useState, useRef } from 'react';
import { useMutation } from '@apollo/client';
import { OtpInputRow } from './OtpInputRow';
import { VerificationTick } from './VerificationTick';
import { GENERATE_EMAIL_OTP, VERIFY_EMAIL_OTP } from '@tutorix/shared-graphql';
import { trackEvent } from '../../../lib/analytics';
import { AnalyticsEvent } from '@tutorix/analytics';

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
  onBackToDetails,
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
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
    setOtpError(value === digits ? '' : 'Numbers only');
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
        
        // Track OTP request (first request or resend)
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
        // Error handled by onError callback
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
          
          // Track successful verification attempt
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
          // Track failed verification attempt
          trackEvent(AnalyticsEvent.OTP_VERIFICATION_FAILED, {
            user_id: userId,
            verification_type: 'email',
            failure_reason: data?.verifyOtp?.message || 'Invalid OTP',
            time_since_otp_request_seconds: timeSinceOtpRequest,
            resend_count: resendCountRef.current,
          });
          
          // Also track as attempted (with success: false)
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
        // Track failed verification attempt due to error
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
        
        // Error handled by onError callback
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
    <div className="w-full text-center space-y-9">
      <div className="flex flex-col items-center justify-center space-y-2 text-center">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-primary">Verify Email</h2>
          <VerificationTick visible={verified} label="email verified" />
        </div>
        <p className="text-sm text-muted">We will send a 6 digit OTP to verify your email.</p>
      </div>

      <div className="space-y-[41px]">
        <div className="flex flex-col gap-[10px] items-center sm:flex-row sm:justify-center sm:gap-[10px]">
          <input
            id="email"
            type="email"
            placeholder="Enter email"
            className={`h-11 w-[270px] rounded-md border ${
              emailError ? 'border-danger' : 'border-subtle'
            } bg-white px-md text-primary shadow-sm focus:border-primary focus:outline-none`}
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            disabled
          />
          <button
            className="h-11 w-40 rounded-md bg-[#5fa8ff] text-white shadow-sm transition hover:bg-[#4a97f5] disabled:cursor-not-allowed disabled:bg-[#5fa8ff]/40"
            disabled={disabled || !email || emailError !== '' || isGeneratingOtp}
            onClick={requestOtp}
          >
            {isGeneratingOtp ? 'Sending...' : 'Get OTP'}
          </button>
        </div>
        {emailError && (
          <p className="text-xs text-danger text-center" role="alert" aria-live="polite">
            {emailError}
          </p>
        )}

        <div className="space-y-[22px]">
          <OtpInputRow
            value={otp}
            onChange={handleOtpChange}
            disabled={disabled || !otpRequested}
            error={otpError}
          />
          <p className="text-xs italic text-muted">Enter 6 digit OTP you received on your email</p>
          {otpError && (
            <p className="text-xs text-danger text-center" role="alert" aria-live="polite">
              {otpError}
            </p>
          )}
          <div className="flex flex-col items-center gap-2">
            <button
              className="h-10 w-40 rounded-md bg-[#5fa8ff] text-white shadow-sm transition hover:bg-[#4a97f5] disabled:cursor-not-allowed disabled:bg-[#5fa8ff]/40"
              disabled={disabled || !otpRequested || !otp || otpError !== '' || otp.length !== 6 || isVerifyingOtp}
              onClick={verify}
            >
              {isVerifyingOtp ? 'Verifying...' : 'Verify OTP'}
            </button>
            <p className="text-xs text-muted">
              Didn't receive OTP?{' '}
              <button
                className="text-primary underline disabled:text-muted"
                type="button"
                disabled={disabled || !otpRequested || resendTimer > 0 || isGeneratingOtp}
                onClick={requestOtp}
              >
                {resendTimer > 0
                  ? `Resend in 0:${resendTimer.toString().padStart(2, '0')}`
                  : 'Resend'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

