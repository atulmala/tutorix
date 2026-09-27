import { render, waitFor } from '@testing-library/react';
import App from './app';

const mockGetAuthToken = jest.fn().mockResolvedValue(null);
const mockRemoveAuthToken = jest.fn().mockResolvedValue(undefined);
const mockFetchMe = jest.fn();
const mockFetchMyTutorProfile = jest.fn();
const mockFetchMyTutorDetail = jest.fn();
const mockFetchMyStudentProfile = jest.fn();
const mockHeartbeat = jest.fn().mockResolvedValue(undefined);
const mockUseLazyQuery = jest.fn();

jest.mock('@tutorix/shared-graphql/client/web/token-storage', () => ({
  getAuthToken: (...args: unknown[]) => mockGetAuthToken(...args),
  getRefreshToken: jest.fn().mockResolvedValue(null),
  removeAuthToken: (...args: unknown[]) => mockRemoveAuthToken(...args),
  setAuthTokens: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@tutorix/shared-graphql', () => ({
  GET_CURRENT_USER: {},
  GET_MY_STUDENT_PROFILE: {},
  GET_MY_TUTOR_PROFILE: {},
  GET_MY_TUTOR_DETAIL: {},
  HEARTBEAT: {},
}));

jest.mock('../components/AnalyticsViewTracker', () => ({
  AnalyticsViewTracker: () => null,
}));

jest.mock('./components/HomeScreen', () => ({
  HomeScreen: () => <div>HomeScreen</div>,
}));
jest.mock('./components/sign-up/SignUp', () => ({ SignUp: () => null }));
jest.mock('./components/Login', () => ({ Login: () => null }));
jest.mock('./components/ForgotPassword', () => ({ ForgotPassword: () => null }));
jest.mock('./components/ResetPassword', () => ({ ResetPassword: () => null }));
jest.mock('./components/PasswordResetAcknowledgement', () => ({
  PasswordResetAcknowledgement: () => null,
}));
jest.mock('./components/tutor-onboarding', () => ({ TutorOnboarding: () => null }));
jest.mock('./components/tutor-bank-setup', () => ({
  TutorBankSetupPage: () => null,
}));
jest.mock('./components/tutor-rate-card-setup', () => ({
  TutorRateCardSetupPage: () => null,
  confirmRateCardLater: (onConfirm: () => void) => onConfirm(),
}));
jest.mock('./components/tutor-profile/TutorProfilePage', () => ({
  TutorProfilePage: () => null,
}));
jest.mock('./components/tutor-home', () => ({
  TutorHomePage: () => null,
}));
jest.mock('./components/tutor-calendar', () => ({
  TutorCalendarPage: () => null,
}));
jest.mock('./components/student-onboarding', () => ({ StudentOnboarding: () => null }));
jest.mock('./components/student-home', () => ({
  StudentHomePage: () => null,
}));
jest.mock('./components/student-tutor-preview/StudentTutorPreviewPage', () => ({
  StudentTutorPreviewPage: () => null,
}));
jest.mock('./components/student-cart/StudentCartPage', () => ({
  StudentCartPage: () => null,
}));
jest.mock('./components/student-cart/StudentCartCheckoutPage', () => ({
  StudentCartCheckoutPage: () => null,
}));
jest.mock('./components/student-cart/StudentClassCreditsPage', () => ({
  StudentClassCreditsPage: () => null,
}));
jest.mock('./components/student-cart/StudentClassSchedulePage', () => ({
  StudentClassSchedulePage: () => null,
}));
jest.mock('./components/student-tutor-search/StudentTutorSearchPage', () => ({
  StudentTutorSearchPage: () => null,
}));
jest.mock('./components/student-profile', () => ({
  StudentProfilePage: () => null,
}));
jest.mock('./components/AppHeader', () => ({
  AppHeader: () => null,
}));

jest.mock('@apollo/client', () => {
  const actual = jest.requireActual('@apollo/client');
  return {
    ...actual,
    useApolloClient: () => ({
      clearStore: jest.fn().mockResolvedValue(undefined),
    }),
    useLazyQuery: (...args: unknown[]) => mockUseLazyQuery(...args),
    useMutation: () => [mockHeartbeat, { loading: false }],
  };
});

let mockLazyQueryCall = 0;

function configureLazyQueries() {
  mockLazyQueryCall = 0;
  mockUseLazyQuery.mockImplementation(() => {
    const handlers = [
      mockFetchMe,
      mockFetchMyTutorProfile,
      mockFetchMyTutorDetail,
      mockFetchMyStudentProfile,
    ];
    const handler = handlers[mockLazyQueryCall % 4];
    mockLazyQueryCall += 1;
    return [handler, { data: null }];
  });
}

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthToken.mockResolvedValue(null);
    mockFetchMe.mockResolvedValue({ data: null });
    mockFetchMyTutorProfile.mockResolvedValue({ data: null });
    mockFetchMyTutorDetail.mockResolvedValue({ data: null });
    mockFetchMyStudentProfile.mockResolvedValue({ data: null });
    mockHeartbeat.mockResolvedValue(undefined);
    configureLazyQueries();
  });

  it('should render successfully', async () => {
    const { baseElement } = render(<App />);
    await waitFor(() => {
      expect(baseElement).toBeTruthy();
    });
  });

  it('should show home screen when no token is stored', async () => {
    const { getByText } = render(<App />);
    await waitFor(() => {
      expect(getByText('HomeScreen')).toBeTruthy();
    });
  });

  it('should bootstrap session when a stored token is valid', async () => {
    mockGetAuthToken.mockResolvedValue('stored-token');
    mockFetchMe.mockResolvedValue({
      data: {
        me: {
          id: 1,
          role: 'TUTOR',
          firstName: 'Tutor',
          lastName: 'User',
          email: 'tutor@example.com',
        },
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(mockFetchMe).toHaveBeenCalled();
    });
  });

  it('should clear session when stored token fails validation', async () => {
    mockGetAuthToken.mockResolvedValue('invalid-token');
    mockFetchMe.mockResolvedValue({ data: { me: null } });

    render(<App />);

    await waitFor(() => {
      expect(mockRemoveAuthToken).toHaveBeenCalled();
    });
  });
});
