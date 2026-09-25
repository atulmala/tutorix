import { fireEvent, render, screen } from '@testing-library/react';
import { AppHeader } from './AppHeader';

jest.mock('../config', () => ({
  BRAND_NAME: 'Tutorix',
}));

jest.mock('../auth/useWebAuth', () => ({
  useWebAuth: () => ({
    user: {
      id: 1,
      firstName: 'Ashton',
      lastName: 'Kuchler',
      email: 'ashton@gmail.com',
      role: 'TUTOR',
    },
  }),
}));

jest.mock('./HeaderProfileAvatar', () => ({
  HeaderProfileAvatar: ({ onNavigate }: { onNavigate?: () => void }) => (
    <button type="button" aria-label="Open profile" onClick={onNavigate}>
      Avatar
    </button>
  ),
}));

jest.mock('./student-cart/CartChip', () => ({
  CartChip: ({ onOpenCart }: { onOpenCart?: () => void }) => (
    <button type="button" aria-label="Cart" onClick={onOpenCart}>
      Cart
    </button>
  ),
}));

jest.mock('./wallet', () => ({
  WalletBalanceChip: ({ onOpenWallet }: { onOpenWallet?: () => void }) => (
    <button type="button" aria-label="Wallet balance ₹0" onClick={onOpenWallet}>
      Wallet
    </button>
  ),
}));

describe('AppHeader', () => {
  it('opens profile from the left avatar and shows wallet before logout', () => {
    const onProfilePress = jest.fn();
    const onOpenWallet = jest.fn();
    render(
      <AppHeader
        onLogout={jest.fn()}
        onProfilePress={onProfilePress}
        onOpenWallet={onOpenWallet}
      />,
    );

    expect(screen.getByText('Tutorix')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open profile' }));
    expect(onProfilePress).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Wallet balance ₹0' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Logout' })).toBeTruthy();
    expect(screen.queryByText('Ashton Kuchler')).toBeNull();
  });

  it('can place the profile avatar on the right', () => {
    const onProfilePress = jest.fn();
    render(
      <AppHeader
        onLogout={jest.fn()}
        onProfilePress={onProfilePress}
        onOpenWallet={jest.fn()}
        profileAlign="right"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open profile' }));
    expect(onProfilePress).toHaveBeenCalledTimes(1);
  });

  it('keeps the profile avatar when back is shown', () => {
    const onProfilePress = jest.fn();
    render(
      <AppHeader
        onLogout={jest.fn()}
        onBack={jest.fn()}
        onProfilePress={onProfilePress}
        onOpenWallet={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Go back' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open profile' }));
    expect(onProfilePress).toHaveBeenCalledTimes(1);
  });
});
