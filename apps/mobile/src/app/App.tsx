import React, { useState } from 'react';
import {
  ApolloProvider,
  ApolloClient,
  NormalizedCacheObject,
  useLazyQuery,
} from '@apollo/client';
import { View, Text, StyleSheet } from 'react-native';
import { SplashScreen } from './components/SplashScreen';
import { LoginScreen } from './components/LoginScreen';
import { ForgotPasswordScreen } from './components/ForgotPasswordScreen';
import { SignUpScreen } from './components/sign-up/SignUpScreen';
import { TutorOnboarding } from './components/tutor-onboarding';
import { ErrorBoundary } from './components/ErrorBoundary';
import { createApolloClient } from '@tutorix/shared-graphql/client/mobile';
import { GET_MY_TUTOR_PROFILE } from '@tutorix/shared-graphql/queries';

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
  | 'home';

function AppContent() {
  const [currentView, setCurrentView] = useState<AppView>('splash');
  const [tutorProfileForOnboarding, setTutorProfileForOnboarding] = useState<{
    certificationStage?: string;
  } | null>(null);
  const [signupResume, setSignupResume] = useState<{
    userId?: number;
    verificationStatus?: { isMobileVerified: boolean; isEmailVerified: boolean };
  } | null>(null);

  const [getMyTutorProfile] = useLazyQuery(GET_MY_TUTOR_PROFILE, {
    onCompleted: (data) => {
      const tutor = data?.myTutorProfile;
      if (!tutor) {
        setTutorProfileForOnboarding(null);
        setCurrentView('home');
        return;
      }
      if (tutor.onBoardingComplete) {
        setTutorProfileForOnboarding(null);
        setCurrentView('home');
      } else {
        setTutorProfileForOnboarding({
          certificationStage: tutor.certificationStage,
        });
        setCurrentView('tutorOnboarding');
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
    setCurrentView('home');
  };

  const handleOnboardingBack = () => {
    setTutorProfileForOnboarding(null);
    setCurrentView('home');
  };

  if (currentView === 'splash') {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }
  if (currentView === 'signup') {
    return (
      <SignUpScreen
        resumeUserId={signupResume?.userId}
        resumeVerificationStatus={signupResume?.verificationStatus}
        onContinueToOnboarding={() => setCurrentView('login')}
      />
    );
  }
  if (currentView === 'forgotPassword') {
    return <ForgotPasswordScreen onBackToLogin={handleBackToLogin} />;
  }
  if (currentView === 'tutorOnboarding') {
    return (
      <TutorOnboarding
        initialProfile={tutorProfileForOnboarding}
        onComplete={handleOnboardingComplete}
        onBack={handleOnboardingBack}
      />
    );
  }
  if (currentView === 'home') {
    return (
      <View style={styles.homePlaceholder}>
        <Text style={styles.homeTitle}>You're all set!</Text>
        <Text style={styles.homeSubtitle}>Onboarding complete.</Text>
      </View>
    );
  }

  return (
    <LoginScreen
      onLoginSuccess={handleLoginSuccess}
      onForgotPassword={handleForgotPassword}
      onSignUp={handleSignUp}
    />
  );
}

const styles = StyleSheet.create({
  homePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  homeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  homeSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 8,
  },
});

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
