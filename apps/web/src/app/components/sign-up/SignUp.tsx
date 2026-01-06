import React, { useState } from 'react';
import { BRAND_NAME } from '../../config';
import { PhoneVerification } from './PhoneVerification';
import { EmailVerification } from './EmailVerification';
import { PasswordModal } from './PasswordModal';

export const SignUp: React.FC = () => {
  const [role, setRole] = useState<'student' | 'tutor'>('student');
  const [mobileVerified, setMobileVerified] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const passwordsMatch =
    password.length >= 6 && confirmPassword.length >= 6 && password === confirmPassword;

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (value && value.length < 6) {
      setPasswordError('Password must be at least 6 characters');
    } else if (confirmPassword && value !== confirmPassword) {
      setPasswordError('Passwords do not match');
    } else {
      setPasswordError('');
    }
  };

  const handleConfirmChange = (value: string) => {
    setConfirmPassword(value);
    if (value && value.length < 6) {
      setPasswordError('Password must be at least 6 characters');
    } else if (password && value !== password) {
      setPasswordError('Passwords do not match');
    } else {
      setPasswordError('');
    }
  };

  const handleSubmitPassword = () => {
    if (!passwordsMatch) {
      setPasswordError('Passwords do not match');
      return;
    }
    // TODO: wire to backend to set password
    setShowPasswordModal(false);
  };

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
        <EmailVerification onVerified={() => undefined} disabled={!mobileVerified} />
      </div>
      <div className="mt-10 flex justify-center">
        <button
          className="h-12 w-48 rounded-lg bg-[#5fa8ff] text-white text-base font-semibold shadow-sm transition hover:bg-[#4a97f5] disabled:cursor-not-allowed disabled:bg-[#5fa8ff]/40"
          disabled={false}
          onClick={() => {
            setPassword('');
            setConfirmPassword('');
            setPasswordError('');
            setShowPasswordModal(true);
          }}
        >
          Continue
        </button>
      </div>
      <PasswordModal
        open={showPasswordModal}
        password={password}
        confirmPassword={confirmPassword}
        error={passwordError}
        onChangePassword={handlePasswordChange}
        onChangeConfirm={handleConfirmChange}
        onClose={() => setShowPasswordModal(false)}
        onSubmit={handleSubmitPassword}
      />
    </div>
  );
};

