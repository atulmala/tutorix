import React from 'react';
import { BRAND_NAME } from '../config';
import { useWebAuth } from '../auth/useWebAuth';
import { HeaderProfileAvatar } from './HeaderProfileAvatar';
import type { ProfilePictureUploadResult } from '../lib/uploadProfilePicture';

type AppHeaderProps = {
  onLogout: () => void;
  showProfileAvatar?: boolean;
};

export const AppHeader: React.FC<AppHeaderProps> = ({
  onLogout,
  showProfileAvatar = true,
}) => {
  const { user: currentUser, refreshUser } = useWebAuth();

  const handleUploadComplete = async (_updated: ProfilePictureUploadResult) => {
    await refreshUser();
  };

  if (!currentUser) {
    return null;
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 md:px-12 md:py-6 bg-white border-b border-subtle">
      <div className="text-2xl font-bold text-primary">{BRAND_NAME}</div>
      <div className="relative flex items-center gap-3">
        {showProfileAvatar ? (
          <HeaderProfileAvatar user={currentUser} onUploadComplete={handleUploadComplete} />
        ) : null}
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
