import { render, screen } from '@testing-library/react';
import { AppHeader } from './AppHeader';

const mockSetUser = jest.fn();

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
    setUser: mockSetUser,
  }),
}));

jest.mock('./HeaderProfileAvatar', () => ({
  HeaderProfileAvatar: () => (
    <button type="button" aria-label="Upload profile picture">
      Avatar
    </button>
  ),
}));

describe('AppHeader', () => {
  it('renders brand, avatar, and logout without display name', () => {
    render(<AppHeader onLogout={jest.fn()} />);

    expect(screen.getByText('Tutorix')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Upload profile picture' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Logout' })).toBeTruthy();
    expect(screen.queryByText('Ashton Kuchler')).toBeNull();
    expect(screen.queryByText('Ashton')).toBeNull();
  });
});
