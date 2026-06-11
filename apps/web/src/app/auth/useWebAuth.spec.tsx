import { render, waitFor } from '@testing-library/react';
import { WebAuthProvider, useWebAuth } from './useWebAuth';

const mockGetAuthToken = jest.fn().mockResolvedValue(null);
const mockRemoveAuthToken = jest.fn().mockResolvedValue(undefined);
const mockFetchMe = jest.fn();
const mockClearStore = jest.fn().mockResolvedValue(undefined);

jest.mock('@tutorix/shared-graphql/client/web/token-storage', () => ({
  getAuthToken: (...args: unknown[]) => mockGetAuthToken(...args),
  removeAuthToken: (...args: unknown[]) => mockRemoveAuthToken(...args),
}));

jest.mock('@tutorix/shared-graphql', () => ({
  GET_CURRENT_USER: {},
}));

jest.mock('@apollo/client', () => {
  const actual = jest.requireActual('@apollo/client');
  return {
    ...actual,
    useApolloClient: () => ({ clearStore: mockClearStore }),
    useLazyQuery: jest.fn(() => [mockFetchMe, { data: null }]),
  };
});

function AuthProbe() {
  const { user, loading } = useWebAuth();
  if (loading) return <div>Loading</div>;
  return <div>{user ? `user:${user.id}` : 'logged-out'}</div>;
}

describe('WebAuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthToken.mockResolvedValue(null);
    mockFetchMe.mockResolvedValue({ data: null });
  });

  it('finishes loading with no user when token is absent', async () => {
    const { getByText } = render(
      <WebAuthProvider>
        <AuthProbe />
      </WebAuthProvider>,
    );

    await waitFor(() => {
      expect(getByText('logged-out')).toBeTruthy();
    });
  });

  it('restores tutor user when token and me query succeed', async () => {
    mockGetAuthToken.mockResolvedValue('token');
    mockFetchMe.mockResolvedValue({
      data: { me: { id: 42, role: 'TUTOR', firstName: 'A' } },
    });

    const { getByText } = render(
      <WebAuthProvider>
        <AuthProbe />
      </WebAuthProvider>,
    );

    await waitFor(() => {
      expect(getByText('user:42')).toBeTruthy();
    });
  });

  it('clears session for non-web roles', async () => {
    mockGetAuthToken.mockResolvedValue('token');
    mockFetchMe.mockResolvedValue({
      data: { me: { id: 1, role: 'ADMIN' } },
    });

    const { getByText } = render(
      <WebAuthProvider>
        <AuthProbe />
      </WebAuthProvider>,
    );

    await waitFor(() => {
      expect(mockRemoveAuthToken).toHaveBeenCalled();
      expect(getByText('logged-out')).toBeTruthy();
    });
  });
});
