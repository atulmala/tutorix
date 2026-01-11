import React, { useState, useEffect } from 'react';
import { useMutation, useLazyQuery } from '@apollo/client';
import { BRAND_NAME } from '../config';
import { RESET_PASSWORD } from '@tutorix/shared-graphql';
import { VALIDATE_RESET_TOKEN } from '@tutorix/shared-graphql';

type ResetPasswordProps = {
  token?: string;
  onSuccess: () => void;
  onBackHome: () => void;
};

export const ResetPassword: React.FC<ResetPasswordProps> = ({ token, onSuccess, onBackHome }) => {
  // Extract token from URL if not provided as prop
  const resetToken = React.useMemo(() => {
    if (token) return token;
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
  }, [token]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string; general?: string }>({});
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenLoading, setTokenLoading] = useState(!!resetToken); // Only show loading if token is available

  // Validate token using lazy query (triggered manually)
  const [validateTokenQuery, { loading: validatingToken }] = useLazyQuery(VALIDATE_RESET_TOKEN, {
    fetchPolicy: 'network-only', // Always fetch to validate token
  });

  // Validate token when it becomes available
  useEffect(() => {
    if (!resetToken) {
      setTokenValid(false);
      setTokenLoading(false);
      return;
    }

    setTokenLoading(true);
    validateTokenQuery({ variables: { token: resetToken } })
      .then((result) => {
        setTokenValid(result.data?.validateResetToken ?? false);
        setTokenLoading(false);
      })
      .catch(() => {
        setTokenValid(false);
        setTokenLoading(false);
      });
  }, [resetToken, validateTokenQuery]);

  // Sync loading state with query loading state
  useEffect(() => {
    if (validatingToken) {
      setTokenLoading(true);
    }
  }, [validatingToken]);

  const [resetPassword, { loading }] = useMutation(RESET_PASSWORD, {
    onCompleted: () => {
      onSuccess();
    },
    onError: (error) => {
      console.error('Reset password error:', error);
      if (error.message.includes('Invalid or expired')) {
        setErrors({ general: 'Invalid or expired reset token. Please request a new password reset link.' });
      } else if (error.message.includes('already been used')) {
        setErrors({ general: 'This reset link has already been used. Please request a new password reset link.' });
      } else {
        setErrors({ general: error.message || 'Failed to reset password. Please try again.' });
      }
    },
  });

  const validateForm = () => {
    const newErrors: { password?: string; confirmPassword?: string } = {};

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.password = 'Passwords do not match';
      newErrors.confirmPassword = 'Passwords do not match';
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

    if (!resetToken) {
      setErrors({ general: 'Reset token is missing. Please use the link from your email.' });
      return;
    }

    try {
      await resetPassword({
        variables: {
          input: {
            token: resetToken,
            password,
          },
        },
      });
    } catch (error) {
      // Error handling is done in onError callback
    }
  };

  // Loading state while validating token
  if (tokenLoading || validatingToken) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-subtle bg-white p-8 shadow-md">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">{BRAND_NAME} • Reset Password</h1>
        </div>
        <div className="text-center py-8">
          <p className="text-sm text-muted">Validating reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (tokenValid === false || !resetToken) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-subtle bg-white p-8 shadow-md">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">{BRAND_NAME} • Reset Password</h1>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold mb-2">Invalid or Expired Link</p>
            <p>
              {!resetToken
                ? 'Reset token is missing. Please use the link from your email.'
                : 'This password reset link is invalid or has expired. Please request a new password reset link.'}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onBackHome}
              className="flex-1 rounded-lg bg-[#5fa8ff] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5]"
            >
              Go to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Valid token - show password reset form
  return (
    <div className="w-full max-w-md rounded-2xl border border-subtle bg-white p-8 shadow-md">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">{BRAND_NAME} • Reset Password</h1>
        <p className="mt-2 text-sm text-muted">
          Enter your new password below. Make sure it's at least 6 characters long.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errors.general}
          </div>
        )}

        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-primary mb-1">
            New Password
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
              placeholder="Enter new password"
              className={`w-full rounded-lg border px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 ${
                errors.password
                  ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-200'
                  : 'border-subtle bg-white text-primary focus:border-primary focus:ring-[#5fa8ff]/20'
              }`}
              disabled={loading}
              autoFocus
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
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-semibold text-primary mb-1">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors((prev) => ({ ...prev, confirmPassword: undefined, general: undefined }));
              }}
              placeholder="Confirm new password"
              className={`w-full rounded-lg border px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 ${
                errors.confirmPassword
                  ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-200'
                  : 'border-subtle bg-white text-primary focus:border-primary focus:ring-[#5fa8ff]/20'
              }`}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-primary hover:text-[#5fa8ff]"
              tabIndex={-1}
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !password || !confirmPassword}
          className="w-full rounded-lg bg-[#5fa8ff] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Resetting Password...' : 'Change Password'}
        </button>
      </form>

      <div className="mt-6">
        <button
          type="button"
          onClick={onBackHome}
          className="text-sm font-semibold text-primary hover:text-[#5fa8ff] hover:underline"
        >
          ← Back to home
        </button>
      </div>
    </div>
  );
};
