import React, { useState } from 'react';
import { BRAND_NAME } from '../../config';
import { PhoneVerification } from './PhoneVerification';
import { EmailVerification } from './EmailVerification';

export const SignUp: React.FC = () => {
  const [role, setRole] = useState<'student' | 'tutor'>('student');
  const [mobileVerified, setMobileVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  return (
    <div className="w-full rounded-2xl border border-subtle bg-white p-8 shadow-md">
      <div className="mb-6 text-center">
        <p className="text-3xl font-bold text-primary">
          Welcome to {BRAND_NAME}. Please complete your sign-up.
        </p>
      </div>
      <div className="mb-6 flex flex-col items-center gap-2">
        <p className="text-lg font-medium text-primary">I want to register as</p>
        <div className="flex items-center gap-4 text-lg text-primary">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="register-role"
              value="student"
              checked={role === 'student'}
              onChange={() => setRole('student')}
              className="h-4 w-4 accent-primary"
            />
            <span>Student</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="register-role"
              value="tutor"
              checked={role === 'tutor'}
              onChange={() => setRole('tutor')}
              className="h-4 w-4 accent-primary"
            />
            <span>Tutor</span>
          </label>
        </div>
      </div>
      <div className="grid w-full gap-12 md:grid-cols-2">
        <PhoneVerification onVerified={() => setMobileVerified(true)} />
        <EmailVerification onVerified={() => setEmailVerified(true)} />
      </div>
      <div className="mt-10 flex justify-center">
        <button
          className="h-12 w-48 rounded-lg bg-primary text-white text-base font-semibold shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/40"
          disabled={!mobileVerified || !emailVerified}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

