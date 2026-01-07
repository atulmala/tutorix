import React, { useEffect, useState } from 'react';
import { OtpInputRow } from './OtpInputRow';
import { VerificationTick } from './VerificationTick';

type PhoneVerificationProps = {
  onVerified: () => void;
  onBack?: () => void;
  initialMobile?: string;
  initialCountryCode?: string;
  helperText?: string;
};

export const PhoneVerification: React.FC<PhoneVerificationProps> = ({
  onVerified,
  onBack,
  initialMobile,
  initialCountryCode,
  helperText,
}) => {
  const [countryCode, setCountryCode] = useState(initialCountryCode ?? 'IN');
  const [mobile, setMobile] = useState(initialMobile ?? '');
  const [mobileError, setMobileError] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    setCountryCode(initialCountryCode ?? 'IN');
  }, [initialCountryCode]);

  useEffect(() => {
    if (initialMobile !== undefined) {
      setMobile(initialMobile);
      setOtp('');
      setOtpRequested(false);
      setVerified(false);
    }
  }, [initialMobile]);

  const handleMobileChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    setMobile(digits);
    setMobileError(value === digits ? '' : 'Numbers only');
    setVerified(false);
  };

  const handleOtpChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
    setOtpError(value === digits ? '' : 'Numbers only');
  };

  const requestOtp = () => {
    if (mobile && !mobileError && mobile.length >= 6) {
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
    <div className="w-full text-center space-y-9">
      <div className="space-y-1">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-xl font-bold text-primary">Verify Phone</h1>
          <VerificationTick visible={verified} label="phone verified" />
        </div>
        <p className="text-sm text-muted">
          {helperText ?? 'We will send a 6 digit OTP to verify your identity.'}
        </p>
      </div>

      <div className="space-y-[41px]">
        <div className="flex flex-col gap-[10px]">
          <div className="flex flex-col items-center gap-[10px] sm:flex-row sm:justify-center sm:gap-[10px]">
            <select
              id="country"
              className="h-11 w-[110px] rounded-md border border-subtle bg-white px-md text-primary shadow-sm focus:border-primary focus:outline-none"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
            disabled
            >
              {/* eslint-disable jsx-a11y/accessible-emoji */}
              <option value="IN">🇮🇳 +91</option>
              <option value="US">🇺🇸 +1</option>
              <option value="GB">🇬🇧 +44</option>
              <option value="AU">🇦🇺 +61</option>
              {/* eslint-enable jsx-a11y/accessible-emoji */}
            </select>
            <input
              id="mobile"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Enter mobile number"
              className={`h-11 w-[192px] rounded-md border ${
                mobileError ? 'border-danger' : 'border-subtle'
              } bg-white px-md text-primary shadow-sm focus:border-primary focus:outline-none`}
              value={mobile}
              onChange={(e) => handleMobileChange(e.target.value)}
              disabled
            />
            <button
              className="h-11 w-40 rounded-md bg-[#5fa8ff] text-white shadow-sm transition hover:bg-[#4a97f5] disabled:cursor-not-allowed disabled:bg-[#5fa8ff]/40"
              disabled={!mobile || mobileError !== '' || mobile.length < 6}
              onClick={requestOtp}
            >
              Get OTP
            </button>
          </div>
          {mobileError && (
            <p className="text-xs text-danger text-center" role="alert" aria-live="polite">
              {mobileError}
            </p>
          )}
        </div>

        <div className="space-y-[22px]">
          <OtpInputRow value={otp} onChange={handleOtpChange} disabled={!otpRequested} error={otpError} />
          <p className="text-xs italic text-muted">Enter 6 digit OTP you received on your mobile</p>
          {otpError && (
            <p className="text-xs text-danger text-center" role="alert" aria-live="polite">
              {otpError}
            </p>
          )}
          <div className="flex flex-col items-center gap-2">
            <button
              className="h-10 w-40 rounded-md bg-[#5fa8ff] text-white shadow-sm transition hover:bg-[#4a97f5] disabled:cursor-not-allowed disabled:bg-[#5fa8ff]/40"
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
                {resendTimer > 0 ? `Resend in 0:${resendTimer.toString().padStart(2, '0')}` : 'Resend'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

