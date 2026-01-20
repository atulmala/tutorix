import React, { useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import { BRAND_NAME } from '../config';
import { LOGIN } from '@tutorix/shared-graphql';
import { getPhoneCountryCode } from '@tutorix/shared-graphql';
import { setAuthToken } from '@tutorix/shared-graphql/client/shared/token-storage';

type LoginProps = {
  onBackHome: () => void;
  onSignUp: (userId?: number, verificationStatus?: { isMobileVerified: boolean; isEmailVerified: boolean }) => void;
  onLoginSuccess?: (user?: { id: number; role: string }) => void;
  onForgotPassword?: () => void;
};

type IncompleteSignupError = {
  message: string;
  userId: number;
  isMobileVerified: boolean;
  isEmailVerified: boolean;
};

export const Login: React.FC<LoginProps> = ({ onBackHome, onSignUp, onLoginSuccess, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('IN'); // Default to India
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; mobile?: string; password?: string; general?: string }>({});
  const [incompleteSignupError, setIncompleteSignupError] = useState<IncompleteSignupError | null>(null);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const successTimerRef = useRef<number | null>(null);

  const [login, { loading }] = useMutation(LOGIN, {
    onCompleted: async (data) => {
      // Store access token for authenticated requests
      if (data?.login?.accessToken) {
        await setAuthToken(data.login.accessToken);
        console.log('Access token stored');
      }
      
      console.log('Login successful:', data);
      setShowSuccessModal(true);
      if (successTimerRef.current) {
        window.clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = window.setTimeout(() => {
        setShowSuccessModal(false);
        // Call onLoginSuccess with user data
        if (onLoginSuccess && data?.login?.user) {
          onLoginSuccess(data.login.user);
        }
      }, 2000);
      
      // Track login event
    },
    onError: (error) => {
      console.error('Login error:', error);
      
      // Try to parse incomplete signup error
      try {
        const errorMessage = error.message || '';
        // Check if error contains JSON with verification status
        if (errorMessage.includes('Please complete your signup')) {
          // Try to find JSON object in the error message
          const jsonMatch = errorMessage.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            // Try parsing the entire message as JSON (if NestJS returns it as JSON string)
            try {
              const parsed = JSON.parse(errorMessage);
              if (parsed.message && parsed.userId) {
                setIncompleteSignupError(parsed as IncompleteSignupError);
                setShowIncompleteModal(true);
                return;
              }
            } catch {
              // Not a JSON string, continue with regex match
            }
          } else {
            try {
              const errorData = JSON.parse(jsonMatch[0]) as IncompleteSignupError;
              if (errorData.message && errorData.userId !== undefined) {
                setIncompleteSignupError(errorData);
                setShowIncompleteModal(true);
                return;
              }
            } catch {
              // JSON parsing failed, continue with general error handling
            }
          }
        }
      } catch (parseError) {
        console.error('Error parsing incomplete signup error:', parseError);
        // If parsing fails, treat as general error
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

  const validateForm = () => {
    const newErrors: { email?: string; mobile?: string; password?: string } = {};
    
    // At least one of email or mobile should be provided
    const hasEmail = email.trim().length > 0;
    const hasMobile = mobile.trim().length > 0;
    
    if (!hasEmail && !hasMobile) {
      newErrors.email = 'Please enter either email or mobile number';
      newErrors.mobile = 'Please enter either email or mobile number';
    } else {
      // If email is provided, validate it (email takes precedence)
      if (hasEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          newErrors.email = 'Please enter a valid email address';
        }
        // Clear mobile error if email is provided and valid
      } else if (hasMobile) {
        // Only validate mobile if email is not provided
        const digitsOnly = mobile.replace(/\D/g, '');
        if (digitsOnly.length < 10) {
          newErrors.mobile = 'Please enter a valid mobile number (at least 10 digits)';
        }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    if (!validateForm()) {
      return;
    }
    
    try {
      // Determine loginId: use email if provided, otherwise use mobile with country code
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
    // Only allow digits
    const digitsOnly = value.replace(/\D/g, '');
    setMobile(digitsOnly);
    // Only clear mobile error if email is not filled (email takes precedence)
    if (!email.trim()) {
      setErrors((prev) => ({ ...prev, mobile: undefined, general: undefined }));
    }
  };

  const handleContinueToSignup = () => {
    if (incompleteSignupError) {
      const { userId, isMobileVerified, isEmailVerified } = incompleteSignupError;
      setShowIncompleteModal(false);
      const verificationStatus = { isMobileVerified, isEmailVerified };
      onSignUp(userId, verificationStatus);
      setIncompleteSignupError(null);
    }
  };

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        window.clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      <div className="w-full max-w-md rounded-2xl border border-subtle bg-white p-8 shadow-md">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">{BRAND_NAME} • Login</h1>
          <p className="mt-2 text-sm text-muted">
            Enter your registered email or mobile number and password to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errors.general}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-primary mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                // Clear both email and mobile errors when email is entered
                // (since email takes precedence, mobile errors are not relevant)
                setErrors((prev) => ({ ...prev, email: undefined, mobile: undefined, general: undefined }));
              }}
              placeholder="Enter your registered Email"
              className={`w-full rounded-lg border px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 ${
                errors.email
                  ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-200'
                  : 'border-subtle bg-white text-primary focus:border-primary focus:ring-[#5fa8ff]/20'
              }`}
              disabled={loading}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email}</p>
            )}
          </div>

          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 border-t border-subtle"></div>
            <span className="text-base font-semibold text-muted">OR</span>
            <div className="flex-1 border-t border-subtle"></div>
          </div>

          <div>
            <label htmlFor="mobile" className="block text-sm font-semibold text-primary mb-1">
              Mobile Number
            </label>
            <div className="flex gap-2">
              <select
                id="country-code"
                value={countryCode}
                onChange={(e) => {
                  setCountryCode(e.target.value);
                  setErrors((prev) => ({ ...prev, mobile: undefined, general: undefined }));
                }}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 ${
                  errors.mobile
                    ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-200'
                    : 'border-subtle bg-white text-primary focus:border-primary focus:ring-[#5fa8ff]/20'
                }`}
                disabled={loading}
              >
                <option value="IN">India (+91)</option>
                <option value="US">United States (+1)</option>
                <option value="GB">United Kingdom (+44)</option>
                <option value="AU">Australia (+61)</option>
                <option value="CA">Canada (+1)</option>
                <option value="DE">Germany (+49)</option>
                <option value="FR">France (+33)</option>
                <option value="IT">Italy (+39)</option>
                <option value="ES">Spain (+34)</option>
                <option value="BR">Brazil (+55)</option>
                <option value="MX">Mexico (+52)</option>
                <option value="JP">Japan (+81)</option>
                <option value="CN">China (+86)</option>
                <option value="KR">South Korea (+82)</option>
                <option value="SG">Singapore (+65)</option>
                <option value="AE">UAE (+971)</option>
                <option value="SA">Saudi Arabia (+966)</option>
              </select>
              <input
                id="mobile"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={mobile}
                onChange={(e) => handleMobileChange(e.target.value)}
                placeholder="Enter your registered Mobile Number"
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 ${
                  errors.mobile
                    ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-200'
                    : 'border-subtle bg-white text-primary focus:border-primary focus:ring-[#5fa8ff]/20'
                }`}
                disabled={loading}
              />
            </div>
            {errors.mobile && (
              <p className="mt-1 text-xs text-red-600">{errors.mobile}</p>
            )}
          </div>

          <div className="mt-6">
            <label htmlFor="password" className="block text-sm font-semibold text-primary mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, password: undefined, general: undefined }));
                }}
                placeholder="Enter your password"
                className={`w-full rounded-lg border px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 ${
                  errors.password
                    ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-200'
                    : 'border-subtle bg-white text-primary focus:border-primary focus:ring-[#5fa8ff]/20'
                }`}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-primary hover:text-[#5fa8ff]"
                tabIndex={-1}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password}</p>
            )}
            {onForgotPassword && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-sm font-semibold text-[#5fa8ff] hover:text-[#4a97f5] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || (!email.trim() && !mobile.trim()) || !password}
            className="w-full rounded-lg bg-[#5fa8ff] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Logging in...
              </span>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => onSignUp()}
            className="font-semibold text-[#5fa8ff] hover:text-[#4a97f5] hover:underline"
          >
            Don't have an account? Sign up
          </button>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={onBackHome}
            className="text-sm font-semibold text-primary hover:text-[#5fa8ff] hover:underline"
          >
            ← Back to home
          </button>
        </div>
      </div>

      {/* Incomplete Signup Modal */}
      {showIncompleteModal && incompleteSignupError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-subtle bg-white p-6 shadow-lg">
            <h2 className="text-xl font-bold text-primary mb-2">Complete Your Signup</h2>
            <p className="text-sm text-muted mb-4">
              {incompleteSignupError.message}
            </p>
            
            <div className="mb-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${incompleteSignupError.isMobileVerified ? 'text-green-600' : 'text-amber-600'}`}>
                  {incompleteSignupError.isMobileVerified ? '✓' : '○'} Mobile Verification:
                </span>
                <span className={incompleteSignupError.isMobileVerified ? 'text-green-600' : 'text-muted'}>
                  {incompleteSignupError.isMobileVerified ? 'Verified' : 'Pending'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${incompleteSignupError.isEmailVerified ? 'text-green-600' : 'text-amber-600'}`}>
                  {incompleteSignupError.isEmailVerified ? '✓' : '○'} Email Verification:
                </span>
                <span className={incompleteSignupError.isEmailVerified ? 'text-green-600' : 'text-muted'}>
                  {incompleteSignupError.isEmailVerified ? 'Verified' : 'Pending'}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowIncompleteModal(false);
                  setIncompleteSignupError(null);
                }}
                className="flex-1 rounded-lg border border-subtle px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:border-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleContinueToSignup}
                className="flex-1 rounded-lg bg-[#5fa8ff] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5]"
              >
                Complete Signup
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-subtle bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-primary text-center">Login Successful</h2>
            <p className="mt-2 text-sm text-muted text-center">
              You have logged in successfully.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
