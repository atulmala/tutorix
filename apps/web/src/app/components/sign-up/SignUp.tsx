import React, { useState, useEffect } from 'react';
import { BRAND_NAME } from '../../config';
import { EmailVerification } from './EmailVerification';
import { BasicDetailsForm, BasicDetails, createEmptyDetails } from './BasicDetailsForm';
import { PhoneVerification } from './PhoneVerification';
import { useSignupTracking } from '../../../hooks/useSignupTracking';

type SignUpProps = {
  onBackHome: () => void;
  onLogin?: () => void;
  resumeUserId?: number;
  resumeVerificationStatus?: { isMobileVerified: boolean; isEmailVerified: boolean };
};

type Step = 'basic' | 'phone' | 'email';

const steps: Array<{ id: Step; label: string }> = [
  { id: 'basic', label: 'Basic details' },
  { id: 'phone', label: 'Verify phone' },
  { id: 'email', label: 'Verify email' },
];

export const SignUp: React.FC<SignUpProps> = ({ 
  onBackHome, 
  onLogin, 
  resumeUserId, 
  resumeVerificationStatus 
}) => {
  const [step, setStep] = useState<Step>('basic');
  const [basicDetails, setBasicDetails] = useState<BasicDetails>(createEmptyDetails());
  const [userId, setUserId] = useState<number | null>(resumeUserId || null);
  const [mobileVerified, setMobileVerified] = useState(resumeVerificationStatus?.isMobileVerified || false);
  const [emailVerified, setEmailVerified] = useState(resumeVerificationStatus?.isEmailVerified || false);

  const {
    startSignup,
    trackStepStart,
    trackStepComplete,
    trackSignupCompleted,
    trackAbandonment,
    loadState,
  } = useSignupTracking();

  // Check for resume on mount or when resume props change
  useEffect(() => {
    if (resumeUserId && resumeVerificationStatus) {
      // User is resuming from login - set userId and verification status
      setUserId(resumeUserId);
      setMobileVerified(resumeVerificationStatus.isMobileVerified);
      setEmailVerified(resumeVerificationStatus.isEmailVerified);
      
      // Navigate directly to the appropriate step
      if (!resumeVerificationStatus.isMobileVerified) {
        setStep('phone');
        trackStepStart('phone');
        startSignup(resumeUserId);
      } else if (!resumeVerificationStatus.isEmailVerified) {
        setStep('email');
        trackStepStart('email');
        startSignup(resumeUserId);
      } else {
        // Both verified - signup should be complete, but handle gracefully
        setStep('basic');
      }
    } else {
      // Check for saved state from previous session
      const savedState = loadState();
      if (savedState?.userId) {
        // We'll check verification status from backend when form is submitted
        // For now, just restore userId if available
        setUserId(savedState.userId);
      }
    }
  }, [resumeUserId, resumeVerificationStatus, loadState, startSignup, trackStepStart]);

  const handleBasicSubmit = (
    details: BasicDetails, 
    registeredUserId: number,
    userVerificationStatus?: { isMobileVerified: boolean; isEmailVerified: boolean }
  ) => {
    setBasicDetails(details);
    setUserId(registeredUserId);
    
    // Track signup start/resume
    startSignup(registeredUserId);
    
    // Determine next step based on verification status (resume logic)
    if (userVerificationStatus) {
      const { isMobileVerified: isMobile, isEmailVerified: isEmail } = userVerificationStatus;
      
      if (isMobile && !isEmail) {
        // Phone verified but email not - jump to email verification
        setMobileVerified(true);
        setStep('email');
        trackStepStart('email');
      } else if (!isMobile) {
        // Phone not verified - go to phone verification
        setStep('phone');
        trackStepStart('phone');
      } else {
        // Both verified - shouldn't happen, but handle gracefully
        setMobileVerified(true);
        setEmailVerified(true);
        trackSignupCompleted(registeredUserId);
      }
    } else {
      // New signup - start with phone verification
      setStep('phone');
      trackStepStart('phone');
    }
    
    // Track basic details submission
    trackStepComplete('basic', registeredUserId);
  };

  const handleMobileVerified = () => {
    setMobileVerified(true);
    trackStepComplete('phone', userId || undefined);
    setStep('email');
    trackStepStart('email');
  };

  const handleEmailVerified = () => {
    setEmailVerified(true);
    trackStepComplete('email', userId || undefined);
    trackSignupCompleted(userId || undefined);
  };

  return (
    <div className="w-full max-w-5xl rounded-2xl border border-subtle bg-white p-8 shadow-md">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-semibold text-primary">{BRAND_NAME} • Sign up</p>
        </div>
        <div className="flex items-center gap-3">
          {step === 'phone' && (
            <button
              type="button"
              onClick={() => setStep('basic')}
              className="rounded-lg border border-subtle px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:border-primary"
            >
              Back to details
            </button>
          )}
          {step === 'email' && (
            <button
              type="button"
              onClick={() => setStep('basic')}
              className="rounded-lg border border-subtle px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:border-primary"
            >
              Back to details
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              trackAbandonment('navigation');
              onBackHome();
            }}
            className="rounded-lg border border-subtle px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:border-primary"
          >
            Back to home
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-primary">
        {steps.map(({ id, label }, idx) => {
          const isActive = step === id;
          const isComplete =
            (id === 'phone' && mobileVerified) || (id === 'email' && emailVerified);
          return (
            <div
              key={id}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 ${
                isActive
                  ? 'border-[#5fa8ff] bg-[#5fa8ff]/10 text-[#1d4ed8]'
                  : isComplete
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-subtle bg-[#f8fafc] text-primary'
              }`}
            >
              <span className="text-xs font-medium text-muted">Step {idx + 1}</span>
              <span className="font-semibold">{label}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        {step === 'basic' && (
          <BasicDetailsForm
            initialValue={basicDetails}
            onSubmit={handleBasicSubmit}
            onBackHome={onBackHome}
            onLogin={onLogin}
          />
        )}

        {step === 'phone' && userId !== null && (
          <div className="space-y-6">
            <PhoneVerification
              userId={userId}
              initialCountryCode={basicDetails.countryCode}
              initialMobile={basicDetails.phone}
              onVerified={handleMobileVerified}
              onBack={() => setStep('basic')}
              helperText="We will send a 6 digit OTP to the phone number you provided."
            />
            {!mobileVerified && (
              <p className="text-center text-xs text-muted">
                After verifying your phone, we'll move you to email verification.
              </p>
            )}
          </div>
        )}

        {step === 'email' && userId !== null && (
          <div className="space-y-6">
            <EmailVerification
              userId={userId}
              initialEmail={basicDetails.email}
              disabled={false}
              onVerified={handleEmailVerified}
              onBackToDetails={() => setStep('basic')}
            />
            <div className="text-center text-sm text-muted">
              We use email verification to keep your account secure.
            </div>
          </div>
        )}
      </div>

      {step === 'email' && emailVerified && (
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">You’re all set!</p>
              <p>Phone and email verified. Continue to complete your profile.</p>
            </div>
            <button
              type="button"
              className="mt-2 rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#16a34a]"
            >
              Continue to build your profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

