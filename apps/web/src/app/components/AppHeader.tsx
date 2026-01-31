import React from 'react';
import { BRAND_NAME } from '../config';

type User = {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
};

type AppHeaderProps = {
  currentUser: User | null;
  onLogout: () => void;
};

export const AppHeader: React.FC<AppHeaderProps> = ({ currentUser, onLogout }) => {
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

  if (!currentUser) {
    return null;
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 md:px-12 md:py-6 bg-white border-b border-subtle">
      <div className="text-2xl font-bold text-primary">{BRAND_NAME}</div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-primary">
          {getUserDisplayName()}
        </span>
        <button
          onClick={onLogout}
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
        >
          Logout
        </button>
      </div>
    </header>
  );
};
