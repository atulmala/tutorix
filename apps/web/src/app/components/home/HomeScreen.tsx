import React from 'react';
import type { WebUser } from '../../types/web-user';
import { HomeFooter } from './HomeFooter';
import { HomeHeader } from './HomeHeader';
import { HomeHero } from './HomeHero';

type HomeScreenProps = {
  onLogin: () => void;
  onSignUp: () => void;
  onStudentDetails: () => void;
  onTutorDetails: () => void;
  currentUser: WebUser | null;
  onLogout: () => void;
  signupSuccessMessage?: string | null;
  onDismissSignupMessage?: () => void;
};

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onLogin,
  onSignUp,
  onStudentDetails,
  onTutorDetails,
  currentUser,
  onLogout,
  signupSuccessMessage,
  onDismissSignupMessage,
}) => {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white via-[#E9F5FE] to-[#e8f1ff] text-primary">
      {signupSuccessMessage ? (
        <div className="w-full bg-green-500 shadow-lg">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4 md:px-12">
            <div className="flex flex-1 items-center justify-center gap-3">
              <span className="text-2xl" aria-hidden>
                🎉
              </span>
              <p className="text-center text-lg font-bold tracking-wide text-white">
                {signupSuccessMessage}
              </p>
              <span className="text-2xl" aria-hidden>
                🎉
              </span>
            </div>
            {onDismissSignupMessage ? (
              <button
                type="button"
                onClick={onDismissSignupMessage}
                className="shrink-0 rounded-lg p-1.5 text-white/80 transition hover:bg-white/20"
                aria-label="Dismiss message"
              >
                <span className="sr-only">Dismiss</span>
                <span aria-hidden className="text-xl font-bold">
                  ×
                </span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <HomeHeader
        currentUser={currentUser}
        onLogin={onLogin}
        onSignUp={onSignUp}
        onLogout={onLogout}
      />

      <main className="relative mx-auto w-full max-w-6xl flex-1 px-6 py-8 md:px-12 md:py-12">
        <HomeHero onStudentDetails={onStudentDetails} onTutorDetails={onTutorDetails} />
        {/* Later expansions (how it works, screenshots, store badges) go below HomeHero. */}
      </main>

      <HomeFooter />
    </div>
  );
};
