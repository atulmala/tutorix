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
};

export const AppHeader: React.FC<AppHeaderProps> = ({
  onLogout,
  onOpenWallet,
  onProfilePress,
  onBack,
  title = BRAND_NAME,
}) => {
  const { user: currentUser } = useWebAuth();

  if (!currentUser) {
    return null;
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 md:px-12 md:py-6 bg-white border-b border-subtle">
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
        ) : onProfilePress ? (
          <HeaderProfileAvatar user={currentUser} onNavigate={onProfilePress} />
        ) : null}
        <div className="text-2xl font-bold text-primary">{title}</div>
      </div>
      <div className="relative flex items-center gap-3">
        {onOpenWallet ? <WalletBalanceChip onOpenWallet={onOpenWallet} /> : null}
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
