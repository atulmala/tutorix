import React from 'react';
import { BRAND_NAME } from '../../config';
import type { WebUser } from '../../types/web-user';

type HomeHeaderProps = {
  currentUser: WebUser | null;
  onHome?: () => void;
  onLogin: () => void;
  onSignUp: () => void;
  onLogout: () => void;
};

function getUserDisplayName(currentUser: WebUser): string {
  const firstName = currentUser.firstName || '';
  const lastName = currentUser.lastName || '';

  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  if (firstName) {
    return firstName;
  }
  if (lastName) {
    return lastName;
  }
  if (currentUser.email) {
    return currentUser.email.split('@')[0];
  }
  return 'User';
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  currentUser,
  onHome,
  onLogin,
  onSignUp,
  onLogout,
}) => {
  const brand = (
    <>
      <img
        src="/tutorix-logo.png"
        alt={onHome ? '' : BRAND_NAME}
        className="h-[40px] w-[40px] shrink-0 object-contain object-center sm:h-[48px] sm:w-[48px] md:h-[56px] md:w-[56px]"
      />
      <span className="truncate text-lg font-bold text-primary sm:text-xl md:text-2xl">
        {BRAND_NAME}
      </span>
    </>
  );

  return (
    <header className="relative z-10 flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:px-6 md:px-12 md:py-5">
      {onHome ? (
        <button
          type="button"
          onClick={onHome}
          className="flex min-w-0 items-center gap-2 text-left sm:gap-3"
          aria-label={`${BRAND_NAME} home`}
        >
          {brand}
        </button>
      ) : (
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">{brand}</div>
      )}
      <div className="flex items-center justify-end gap-2 sm:gap-3">
        {currentUser ? (
          <>
            <span className="hidden text-sm font-semibold text-primary sm:inline">
              {getUserDisplayName(currentUser)}
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onLogin}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-primary underline decoration-primary/60 decoration-2 underline-offset-4 sm:px-4"
            >
              Login
            </button>
            <button
              type="button"
              onClick={onSignUp}
              className="rounded-lg bg-[#5fa8ff] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5] sm:px-5"
            >
              Sign up
            </button>
          </>
        )}
      </div>
    </header>
  );
};
