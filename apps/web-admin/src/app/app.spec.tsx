import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('@tutorix/shared-graphql', () => ({
  GET_CURRENT_USER: {},
  GET_ADMIN_DASHBOARD_STATS: {},
  LOGIN: {},
}));

jest.mock('@tutorix/shared-graphql/client/web/token-storage', () => ({
  getAuthToken: jest.fn().mockResolvedValue(null),
  getRefreshToken: jest.fn().mockResolvedValue(null),
  removeAuthToken: jest.fn().mockResolvedValue(undefined),
  setAuthTokens: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@apollo/client', () => {
  const actual = jest.requireActual('@apollo/client');
  return {
    ...actual,
    useApolloClient: () => ({ clearStore: jest.fn().mockResolvedValue(undefined) }),
    useLazyQuery: () => [jest.fn(), { data: null }],
    useMutation: () => [jest.fn()],
    useQuery: () => ({ data: null, loading: false, error: null }),
  };
});

import App from './app';

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    );
    expect(baseElement).toBeTruthy();
  });

  it('should show admin login title', () => {
    const { getByRole } = render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    );
    expect(getByRole('heading', { name: 'Tutorix Admin' })).toBeTruthy();
  });
});
