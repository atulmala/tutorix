import React from 'react';
import { BRAND_NAME } from '../config';

type PasswordResetAcknowledgementProps = {
  onBackHome: () => void;
  onLogin: () => void;
};

export const PasswordResetAcknowledgement: React.FC<PasswordResetAcknowledgementProps> = ({ onBackHome, onLogin }) => {
  // Get homepage URL from environment variable or default
  const homepageUrl = import.meta.env.VITE_FRONTEND_URL || 'https://www.tutorix.com';

  return (
    <div className="w-full max-w-md rounded-2xl border border-subtle bg-white p-8 shadow-md">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">{BRAND_NAME} • Password Reset</h1>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-sm text-green-700">
          <div className="mb-3 flex items-center gap-2">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-base font-semibold">Password Changed Successfully</p>
          </div>
          <p className="text-muted">
            Your password has been changed successfully. You can now login with your new password.
          </p>
        </div>

        <div className="rounded-lg border border-subtle bg-[#f8fafc] p-4 text-sm text-muted">
          <p className="mb-2">Next steps:</p>
          <p>
            Please go to{' '}
            <a
              href={homepageUrl}
              className="font-semibold text-[#5fa8ff] hover:text-[#4a97f5] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {homepageUrl}
            </a>{' '}
            and login again with your new password.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onLogin}
            className="flex-1 rounded-lg bg-[#5fa8ff] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5]"
          >
            Go to Login
          </button>
          <button
            type="button"
            onClick={onBackHome}
            className="rounded-lg border border-subtle px-4 py-3 text-sm font-semibold text-primary shadow-sm hover:border-primary"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
};
