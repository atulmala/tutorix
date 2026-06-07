import React, { useState, useCallback } from 'react';
import { View } from 'react-native';
import {
  ApolloProvider,
  ApolloClient,
  NormalizedCacheObject,
  useLazyQuery,
  useApolloClient,
} from '@apollo/client';
import { SplashScreen } from './components/SplashScreen';
import { HomeScreen } from './components/HomeScreen';
import { LoginScreen } from './components/LoginScreen';
import { ForgotPasswordScreen } from './components/ForgotPasswordScreen';
import { SignUpScreen } from './components/sign-up/SignUpScreen';
import { TutorOnboarding } from './components/tutor-onboarding';
import { TutorDetailScreen } from './components/tutor-profile/TutorDetailScreen';
import { NavHeader } from './components/NavHeader';
import { ErrorBoundary } from './components/ErrorBoundary';
import { createApolloClient } from '@tutorix/shared-graphql/client/mobile';
import { removeAuthToken } from '@tutorix/shared-graphql/client/mobile/token-storage';
import { GET_MY_TUTOR_PROFILE } from '@tutorix/shared-graphql/queries';
import { AnalyticsViewTracker } from '../components/AnalyticsViewTracker';

let apolloClient: ApolloClient<NormalizedCacheObject> | null = null;
let apolloClientError: Error | null = null;

function getApolloClient(): ApolloClient<NormalizedCacheObject> | null {
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
  | 'home';

function AppContent() {
  const apolloClient = useApolloClient();
  const [currentView, setCurrentView] = useState<AppView>('splash');
  const [tutorProfileForOnboarding, setTutorProfileForOnboarding] = useState<{
    certificationStage?: string;
  } | null>(null);
  const [signupResume, setSignupResume] = useState<{
    userId?: number;
    verificationStatus?: { isMobileVerified: boolean; isEmailVerified: boolean };
  } | null>(null);

  const handleLogout = useCallback(async () => {
    await removeAuthToken();
    await apolloClient.clearStore();
    setCurrentView('login');
    setTutorProfileForOnboarding(null);
    setSignupResume(null);
  }, [apolloClient]);

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

  const handleSplashFinish = () => setCurrentView('login');

  const handleLoginSuccess = (user?: { id: number; role?: string }) => {
    const isTutor =
      user?.role != null && String(user.role).toUpperCase() === 'TUTOR';
    if (isTutor || user === undefined) {
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

  const handleBackToLogin = () => {
    setCurrentView('login');
    setSignupResume(null);
  };

  const handleOnboardingComplete = () => {
    setTutorProfileForOnboarding(null);
    setCurrentView('tutorProfile');
  };

  let screen: React.ReactNode;
  if (currentView === 'splash') {
    screen = <SplashScreen onFinish={handleSplashFinish} />;
  } else if (currentView === 'signup') {
    screen = (
      <SignUpScreen
        resumeUserId={signupResume?.userId}
        resumeVerificationStatus={signupResume?.verificationStatus}
        onContinueToOnboarding={() => setCurrentView('login')}
      />
    );
  } else if (currentView === 'forgotPassword') {
    screen = <ForgotPasswordScreen onBackToLogin={handleBackToLogin} />;
  } else if (currentView === 'tutorOnboarding') {
    screen = (
      <TutorOnboarding
        initialProfile={tutorProfileForOnboarding}
        onComplete={handleOnboardingComplete}
        onLogout={handleLogout}
      />
    );
  } else if (currentView === 'tutorProfile') {
    screen = (
      <View style={{ flex: 1 }}>
        <NavHeader title="My profile" onLogout={handleLogout} />
        <TutorDetailScreen />
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
    <ApolloProvider client={client}>
      <AppContent />
    </ApolloProvider>
  );
};

export default App;
