import React, { useEffect, useState } from 'react';
import { OtpInputRow } from './OtpInputRow';
import { VerificationTick } from './VerificationTick';

type EmailVerificationProps = {
  onVerified: () => void;
  disabled?: boolean;
  initialEmail?: string;
  onBackToDetails?: () => void;
};

export const EmailVerification: React.FC<EmailVerificationProps> = ({
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

  useEffect(() => {
    if (initialEmail !== undefined) {
      setEmail(initialEmail);
      setOtp('');
      setOtpRequested(false);
      setVerified(false);
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

  const requestOtp = () => {
    if (disabled) return;
    if (email && !emailError) {
      setOtpRequested(true);
      setOtp('');
      setOtpError('');
      setResendTimer(60);
      setVerified(false);
    }
  };

  const verify = () => {
    if (disabled) return;
    if (otpRequested && otp && !otpError && otp.length >= 4) {
      setVerified(true);
      onVerified();
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
            disabled={disabled || !email || emailError !== ''}
            onClick={requestOtp}
          >
            Get OTP
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
              disabled={disabled || !otpRequested || !otp || otpError !== '' || otp.length < 4}
              onClick={verify}
            >
              Verify OTP
            </button>
            <p className="text-xs text-muted">
              Didn’t receive OTP?{' '}
              <button
                className="text-primary underline disabled:text-muted"
                type="button"
                disabled={disabled || !otpRequested || resendTimer > 0}
                onClick={() => {
                  setOtp('');
                  setOtpError('');
                  setResendTimer(60);
                }}
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

