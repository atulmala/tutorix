import React from 'react';
import { BRAND_NAME } from '../config';
import { useWebAuth } from '../auth/useWebAuth';
import { HeaderProfileAvatar } from './HeaderProfileAvatar';
import { WalletBalanceChip } from './wallet';

type AppHeaderProps = {
  onLogout: () => void;
  onOpenWallet?: () => void;
  onProfilePress?: () => void;
  onBack?: () => void;
  title?: string;
  profileAlign?: 'left' | 'right';
  flush?: boolean;
};

export const AppHeader: React.FC<AppHeaderProps> = ({
  onLogout,
  onOpenWallet,
  onProfilePress,
  onBack,
  title = BRAND_NAME,
  profileAlign = 'left',
  flush = false,
}) => {
  const { user: currentUser } = useWebAuth();

  if (!currentUser) {
    return null;
  }

  const showLeftProfile = Boolean(onProfilePress) && !onBack && profileAlign === 'left';
  const showRightProfile = Boolean(onProfilePress) && !onBack && profileAlign === 'right';

  return (
    <header
      className={`flex items-center justify-between px-6 py-4 md:px-12 md:py-6 ${
        flush ? 'bg-[#e8f4ff]' : 'border-b border-subtle bg-white'
      }`}
    >
      <div className="flex items-center gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-subtle px-3 py-1.5 text-sm font-semibold text-primary transition hover:bg-gray-50"
            aria-label="Go back"
          >
            Back
          </button>
        ) : showLeftProfile ? (
          <HeaderProfileAvatar user={currentUser} onNavigate={onProfilePress} />
        ) : null}
        <div className={`text-2xl font-bold ${flush ? 'text-[#1d4ed8]' : 'text-primary'}`}>{title}</div>
      </div>
      <div className="relative flex items-center gap-3">
        {onOpenWallet ? <WalletBalanceChip onOpenWallet={onOpenWallet} /> : null}
        {showRightProfile ? (
          <HeaderProfileAvatar user={currentUser} onNavigate={onProfilePress} />
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
