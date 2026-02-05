import React from 'react';
import { BRAND_NAME } from '../config';

// User type for logged-in user display
type User = {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
};

type HomeScreenProps = {
  onLogin: () => void;
  onSignUp: () => void;
  currentUser: User | null;
  onLogout: () => void;
  signupSuccessMessage?: string | null;
  onDismissSignupMessage?: () => void;
};

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onLogin,
  onSignUp,
  currentUser,
  onLogout,
  signupSuccessMessage,
  onDismissSignupMessage,
}) => {
  const getUserDisplayName = () => {
    if (!currentUser) return null;
    
    const firstName = currentUser.firstName || '';
    const lastName = currentUser.lastName || '';
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    } else if (currentUser.email) {
      return currentUser.email.split('@')[0];
    }
    return 'User';
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white via-[#eef3ff] to-[#e5e7eb] text-primary">
      {signupSuccessMessage && (
        <div className="mx-auto w-full max-w-6xl px-6 pt-4 md:px-12">
          <div
            role="alert"
            className="flex items-center justify-between gap-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 shadow-sm"
          >
            <p className="font-medium">{signupSuccessMessage}</p>
            {onDismissSignupMessage && (
              <button
                type="button"
                onClick={onDismissSignupMessage}
                className="shrink-0 rounded-lg p-1.5 text-green-700 transition hover:bg-green-100"
                aria-label="Dismiss message"
              >
                <span className="sr-only">Dismiss</span>
                <span aria-hidden>×</span>
              </button>
            )}
          </div>
        </div>
      )}
      <header className="flex items-center justify-between px-6 py-4 md:px-12 md:py-6">
        <div className="text-2xl font-bold text-primary">{BRAND_NAME}</div>
        <div className="flex items-center gap-3">
          {currentUser ? (
            <>
              <span className="text-sm font-semibold text-primary">
                {getUserDisplayName()}
              </span>
              <button
                onClick={onLogout}
                className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onLogin}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-primary underline decoration-primary/60 decoration-2 underline-offset-4"
              >
                Login
              </button>
              <button
                onClick={onSignUp}
                className="rounded-lg bg-[#5fa8ff] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5]"
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-10 md:px-12">
        <div className="grid w-full gap-10 md:grid-cols-2 md:items-center">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#4a97f5]">
              Smart learning, simplified
            </p>
            <h1 className="text-4xl font-bold leading-tight text-primary md:text-5xl">
              Welcome to {BRAND_NAME}. Learn and teach with confidence.
            </h1>
            <p className="text-lg text-muted">
              Build your profile in a few guided steps. Start with your basic details, verify
              your phone, confirm your email, and you’re ready to explore courses and
              tutoring opportunities.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={onSignUp}
                className="rounded-lg bg-[#5fa8ff] px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-[#4a97f5]"
              >
                Get started
              </button>
              <button
                onClick={onLogin}
                className="rounded-lg border border-subtle px-6 py-3 text-base font-semibold text-primary shadow-sm transition hover:border-primary"
              >
                I already have an account
              </button>
            </div>
            <ul className="grid gap-2 text-sm text-muted">
              <li>• Guided four-step sign-up flow</li>
              <li>• Secure phone and email verification</li>
              <li>• Options for students and tutors</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-[#c7d5ff] bg-white/80 p-8 shadow-lg backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted">Registration preview</p>
                <p className="text-xl font-bold text-primary">Capture basic details</p>
              </div>
              <span className="rounded-full bg-[#e8f1ff] px-3 py-1 text-xs font-semibold text-[#1d4ed8]">
                Step 1 of 4
              </span>
            </div>
            <div className="mt-6 space-y-4 text-sm text-muted">
              <div className="rounded-xl border border-subtle bg-[#f8fafc] p-4 shadow-sm">
                <p className="font-semibold text-primary">What you’ll do</p>
                <ul className="mt-2 space-y-1">
                  <li>• Share your name and contact details</li>
                  <li>• Pick your role: Student or Tutor</li>
                  <li>• Create a secure password</li>
                </ul>
              </div>
              <div className="rounded-xl border border-[#d9e3ff] bg-[#f1f5ff] p-4 shadow-sm">
                <p className="font-semibold text-primary">Next steps</p>
                <p>Verify your phone, then confirm your email via OTP.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};


