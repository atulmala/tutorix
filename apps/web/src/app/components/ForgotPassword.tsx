import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { BRAND_NAME } from '../config';
import { FORGOT_PASSWORD } from '@tutorix/shared-graphql';

type ForgotPasswordProps = {
  onBackHome: () => void;
  onBackToLogin: () => void;
};

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBackHome, onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ email?: string; general?: string }>({});
  const [submitted, setSubmitted] = useState(false);

  const [forgotPassword, { loading }] = useMutation(FORGOT_PASSWORD, {
    onCompleted: () => {
      setSubmitted(true);
    },
    onError: (error) => {
      console.error('Forgot password error:', error);
      // Always show success message (security: don't reveal if email exists)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (error) {
      // Error handling is done in onError callback
      // Always show success for security
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-subtle bg-white p-8 shadow-md">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">{BRAND_NAME} • Password Reset</h1>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <p className="font-semibold mb-2">Check your email</p>
            <p>
              If an account with the email <strong>{email}</strong> exists, we've sent you a password reset link.
            </p>
            <p className="mt-2">
              Please check your inbox and click on the link to reset your password. The link will expire in 1 hour.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onBackToLogin}
              className="flex-1 rounded-lg bg-[#5fa8ff] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5]"
            >
              Back to Login
            </button>
            <button
              type="button"
              onClick={onBackHome}
              className="rounded-lg border border-subtle px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:border-primary"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-subtle bg-white p-8 shadow-md">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">{BRAND_NAME} • Forgot Password</h1>
        <p className="mt-2 text-sm text-muted">
          Enter your email address and we'll send you a link to reset your password.
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
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((prev) => ({ ...prev, email: undefined, general: undefined }));
            }}
            placeholder="your@email.com"
            className={`w-full rounded-lg border px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 ${
              errors.email
                ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-200'
                : 'border-subtle bg-white text-primary focus:border-primary focus:ring-[#5fa8ff]/20'
            }`}
            disabled={loading}
            autoFocus
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="w-full rounded-lg bg-[#5fa8ff] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-center gap-3 text-sm">
        <button
          type="button"
          onClick={onBackToLogin}
          className="font-semibold text-[#5fa8ff] hover:text-[#4a97f5] hover:underline"
        >
          Back to Login
        </button>
        <span className="text-muted">•</span>
        <button
          type="button"
          onClick={onBackHome}
          className="font-semibold text-primary hover:text-[#5fa8ff] hover:underline"
        >
          Home
        </button>
      </div>
    </div>
  );
};
