import React, { useState, useCallback } from 'react';
import { View } from 'react-native';
import {
  ApolloProvider,
  useLazyQuery,
  useMutation,
  useApolloClient,
} from '@apollo/client';
import { SplashScreen } from './components/SplashScreen';
import { HomeScreen } from './components/HomeScreen';
import { LoginScreen } from './components/LoginScreen';
import { ForgotPasswordScreen } from './components/ForgotPasswordScreen';
import { SignUpScreen } from './components/sign-up/SignUpScreen';
import { TutorOnboarding } from './components/tutor-onboarding';
import { StudentOnboarding } from './components/student-onboarding';
import { StudentDetailScreen } from './components/student-profile/StudentDetailScreen';
import { TutorDetailScreen } from './components/tutor-profile/TutorDetailScreen';
import { WalletScreen } from './components/wallet';
import { NavHeader } from './components/NavHeader';
import { ErrorBoundary } from './components/ErrorBoundary';
import { createApolloClient } from '@tutorix/shared-graphql/client/mobile';
import {
  removeAuthToken,
  setAuthToken,
} from '@tutorix/shared-graphql/client/mobile/token-storage';
import { GET_MY_STUDENT_PROFILE, GET_MY_TUTOR_PROFILE } from '@tutorix/shared-graphql/queries';
import { LOGIN } from '@tutorix/shared-graphql/mutations';
import {
  registerPushNotifications,
  unregisterPushNotifications,
} from '../lib/push-notifications';
import { AnalyticsViewTracker } from '../components/AnalyticsViewTracker';
import { FeatureFlagsProvider } from './feature-flags/FeatureFlagsContext';
import { AppUpdateGate } from './components/AppUpdateGate';

/** Align with createApolloClient's package types (avoids dual @apollo/client installs). */
type AppApolloClient = ReturnType<typeof createApolloClient>;

let apolloClient: AppApolloClient | null = null;
let apolloClientError: Error | null = null;

function getApolloClient(): AppApolloClient | null {
  if (apolloClient) return apolloClient;
  if (apolloClientError) return null;
  try {
    apolloClient = createApolloClient();
    return apolloClient;
  } catch (error) {
    apolloClientError = error instanceof Error ? error : new Error(String(error));
    console.error('[App] Failed to create Apollo Client:', error);
    return null;
  }
}

type AppView =
  | 'splash'
  | 'login'
  | 'forgotPassword'
  | 'signup'
  | 'tutorOnboarding'
  | 'tutorProfile'
  | 'studentOnboarding'
  | 'studentProfile'
  | 'wallet'
  | 'home';

type WalletReturnView = 'tutorProfile' | 'studentProfile';

function AppContent() {
  const apolloClient = useApolloClient();
  const [currentView, setCurrentView] = useState<AppView>('splash');
  const [walletReturnView, setWalletReturnView] =
    useState<WalletReturnView>('tutorProfile');
  const [tutorProfileForOnboarding, setTutorProfileForOnboarding] = useState<{
    certificationStage?: string;
  } | null>(null);
  const [studentProfileForOnboarding, setStudentProfileForOnboarding] = useState<{
    onboardingStage?: string;
  } | null>(null);
  const [signupResume, setSignupResume] = useState<{
    userId?: number;
    verificationStatus?: { isMobileVerified: boolean; isEmailVerified: boolean };
  } | null>(null);

  const handleLogout = useCallback(async () => {
    await unregisterPushNotifications(apolloClient);
    await removeAuthToken();
    await apolloClient.clearStore();
    setCurrentView('login');
    setTutorProfileForOnboarding(null);
    setStudentProfileForOnboarding(null);
    setSignupResume(null);
  }, [apolloClient]);

  const routeStudentAfterProfile = useCallback(
    (student: {
      onBoardingComplete?: boolean;
      onboardingStage?: string | null;
    } | null | undefined) => {
      if (!student) {
        setStudentProfileForOnboarding(null);
        setCurrentView('home');
        return;
      }
      if (!student.onBoardingComplete) {
        setStudentProfileForOnboarding({
          onboardingStage: student.onboardingStage ?? undefined,
        });
        setCurrentView('studentOnboarding');
      } else {
        setStudentProfileForOnboarding(null);
        setCurrentView('studentProfile');
      }
    },
    [],
  );

  const [getMyTutorProfile] = useLazyQuery(GET_MY_TUTOR_PROFILE, {
    onCompleted: (data) => {
      const tutor = data?.myTutorProfile;
      if (!tutor) {
        setTutorProfileForOnboarding(null);
        setCurrentView('home');
        return;
      }
      if (!tutor.onBoardingComplete) {
        setTutorProfileForOnboarding({
          certificationStage: tutor.certificationStage,
        });
        setCurrentView('tutorOnboarding');
      } else if (!tutor.onboardingCelebrationSeen) {
        setTutorProfileForOnboarding({ certificationStage: 'complete' });
        setCurrentView('tutorOnboarding');
      } else {
        setTutorProfileForOnboarding(null);
        setCurrentView('tutorProfile');
      }
    },
    onError: () => {
      setCurrentView('home');
    },
    fetchPolicy: 'network-only',
  });

  const [getMyStudentProfile] = useLazyQuery(GET_MY_STUDENT_PROFILE, {
    onCompleted: (data) => {
      routeStudentAfterProfile(data?.myStudentProfile);
    },
    onError: () => {
      setCurrentView('home');
    },
    fetchPolicy: 'network-only',
  });

  const [loginMutation] = useMutation(LOGIN);

  const handleSplashFinish = () => setCurrentView('login');

  const handleLoginSuccess = (user?: { id: number; role?: string }) => {
    void registerPushNotifications(apolloClient);
    const role = user?.role != null ? String(user.role).toUpperCase() : undefined;
    if (role === 'STUDENT') {
      getMyStudentProfile();
    } else if (role === 'TUTOR' || user === undefined) {
      getMyTutorProfile();
    } else {
      setCurrentView('home');
    }
  };

  const handleForgotPassword = () => setCurrentView('forgotPassword');

  const handleSignUp = (
    userId?: number,
    verificationStatus?: { isMobileVerified: boolean; isEmailVerified: boolean }
  ) => {
    setSignupResume(userId ? { userId, verificationStatus } : null);
    setCurrentView('signup');
  };

  const handleSignupComplete = useCallback(
    async (email: string, password: string) => {
      try {
        const { data } = await loginMutation({
          variables: { input: { loginId: email, password } },
        });
        const accessToken = data?.login?.accessToken;
        if (accessToken) {
          await setAuthToken(accessToken);
        }
        handleLoginSuccess(data?.login?.user);
      } catch {
        setCurrentView('login');
      }
    },
    [loginMutation],
  );

  const handleBackToLogin = () => {
    setCurrentView('login');
    setSignupResume(null);
  };

  const handleTutorOnboardingComplete = () => {
    setTutorProfileForOnboarding(null);
    setCurrentView('tutorProfile');
  };

  const handleStudentOnboardingComplete = () => {
    setStudentProfileForOnboarding(null);
    setCurrentView('studentProfile');
  };

  const handleOpenWallet = useCallback((from: WalletReturnView) => {
    setWalletReturnView(from);
    setCurrentView('wallet');
  }, []);

  const handleWalletBack = useCallback(() => {
    setCurrentView(walletReturnView);
  }, [walletReturnView]);

  let screen: React.ReactNode;
  if (currentView === 'splash') {
    screen = <SplashScreen onFinish={handleSplashFinish} />;
  } else if (currentView === 'signup') {
    screen = (
      <SignUpScreen
        resumeUserId={signupResume?.userId}
        resumeVerificationStatus={signupResume?.verificationStatus}
        onVerificationComplete={handleSignupComplete}
        onFallbackToLogin={() => setCurrentView('login')}
      />
    );
  } else if (currentView === 'forgotPassword') {
    screen = <ForgotPasswordScreen onBackToLogin={handleBackToLogin} />;
  } else if (currentView === 'tutorOnboarding') {
    screen = (
      <TutorOnboarding
        initialProfile={tutorProfileForOnboarding}
        onComplete={handleTutorOnboardingComplete}
        onLogout={handleLogout}
      />
    );
  } else if (currentView === 'studentOnboarding') {
    screen = (
      <StudentOnboarding
        initialProfile={studentProfileForOnboarding}
        onComplete={handleStudentOnboardingComplete}
        onLogout={handleLogout}
      />
    );
  } else if (currentView === 'studentProfile') {
    screen = (
      <View style={{ flex: 1 }}>
        <NavHeader title="My profile" onLogout={handleLogout} />
        <StudentDetailScreen
          onOpenWallet={() => handleOpenWallet('studentProfile')}
        />
      </View>
    );
  } else if (currentView === 'tutorProfile') {
    screen = (
      <View style={{ flex: 1 }}>
        <NavHeader title="My profile" onLogout={handleLogout} />
        <TutorDetailScreen
          onOpenWallet={() => handleOpenWallet('tutorProfile')}
        />
      </View>
    );
  } else if (currentView === 'wallet') {
    screen = (
      <View style={{ flex: 1 }}>
        <NavHeader
          title="Wallet"
          onBack={handleWalletBack}
          onLogout={handleLogout}
        />
        <WalletScreen onBack={handleWalletBack} />
      </View>
    );
  } else if (currentView === 'home') {
    screen = <HomeScreen onLogout={handleLogout} />;
  } else {
    screen = (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        onForgotPassword={handleForgotPassword}
        onSignUp={handleSignUp}
      />
    );
  }

  return (
    <>
      <AnalyticsViewTracker screenName={currentView} />
      {screen}
    </>
  );
}

export const App = () => {
  const client = getApolloClient();

  if (!client) {
    return (
      <ErrorBoundary>
        <SplashScreen onFinish={() => { /* no-op when no client */ }} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ApolloProvider
        client={
          // Dual @apollo/client installs (root vs apps/mobile) make these types nominally incompatible.
          client as unknown as React.ComponentProps<typeof ApolloProvider>['client']
        }
      >
        <FeatureFlagsProvider>
          <AppUpdateGate>
            <AppContent />
          </AppUpdateGate>
        </FeatureFlagsProvider>
      </ApolloProvider>
    </ErrorBoundary>
  );
};

export default App;
