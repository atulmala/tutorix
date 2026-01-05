import React, { useEffect, useState } from 'react';
import { OtpInputRow } from './OtpInputRow';
import { VerificationTick } from './VerificationTick';

type EmailVerificationProps = {
  onVerified: () => void;
};

export const EmailVerification: React.FC<EmailVerificationProps> = ({ onVerified }) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [verified, setVerified] = useState(false);

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
    if (email && !emailError) {
      setOtpRequested(true);
      setOtp('');
      setOtpError('');
      setResendTimer(60);
      setVerified(false);
    }
  };

  const verify = () => {
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
    <div className="w-full text-center space-y-9 md:border-l-[6px] md:border-solid md:border-[#b0c4ff] md:pl-10">
      <div className="space-y-1">
        <div className="flex items-center justify-center gap-2">
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
          />
          <button
            className="h-11 w-40 rounded-md bg-primary text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/40"
            disabled={!email || emailError !== ''}
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
          <OtpInputRow value={otp} onChange={handleOtpChange} disabled={!otpRequested} error={otpError} />
          <p className="text-xs italic text-muted">Enter 6 digit OTP you received on your email</p>
          {otpError && (
            <p className="text-xs text-danger text-center" role="alert" aria-live="polite">
              {otpError}
            </p>
          )}
          <div className="flex flex-col items-center gap-2">
            <button
              className="h-10 w-40 rounded-md bg-primary text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/50"
              disabled={!otpRequested || !otp || otpError !== '' || otp.length < 4}
              onClick={verify}
            >
              Verify OTP
            </button>
            <p className="text-xs text-muted">
              Didn’t receive OTP?{' '}
              <button
                className="text-primary underline disabled:text-muted"
                type="button"
                disabled={!otpRequested || resendTimer > 0}
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

