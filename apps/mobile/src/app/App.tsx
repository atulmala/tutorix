import React, { useState } from 'react';
import { ApolloProvider, ApolloClient, NormalizedCacheObject } from '@apollo/client';
import { SplashScreen } from './components/SplashScreen';
import { LoginScreen } from './components/LoginScreen';
import { ForgotPasswordScreen } from './components/ForgotPasswordScreen';
import { SignUpScreen } from './components/sign-up/SignUpScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { createApolloClient } from '@tutorix/shared-graphql/client/mobile';

// Import Apollo Client lazily to prevent module load errors
// This ensures the App component can load even if Apollo Client fails
let apolloClient: ApolloClient<NormalizedCacheObject> | null = null;
let apolloClientError: Error | null = null;

function getApolloClient(): ApolloClient<NormalizedCacheObject> | null {
  if (apolloClient) {
    return apolloClient;
  }
  if (apolloClientError) {
    return null;
  }
  try {
    // Use createApolloClient directly
    apolloClient = createApolloClient();
    return apolloClient;
  } catch (error) {
    apolloClientError = error instanceof Error ? error : new Error(String(error));
    console.error('[App] Failed to create Apollo Client:', error);
    return null;
  }
}

type AppView = 'splash' | 'login' | 'forgotPassword' | 'signup';

export const App = () => {
  console.log('[App] 🎯 App component rendering - this should show SplashScreen');
  console.log('[App] Component function called');
  const [currentView, setCurrentView] = useState<AppView>('splash');
  console.log('[App] State initialized, currentView:', currentView);
  const [signupResume, setSignupResume] = useState<{
    userId?: number;
    verificationStatus?: { isMobileVerified: boolean; isEmailVerified: boolean };
  } | null>(null);

  const handleSplashFinish = () => {
    setCurrentView('login');
  };

  const handleLoginSuccess = () => {
    // TODO: Navigate to home/dashboard after successful login
  };

  const handleForgotPassword = () => {
    setCurrentView('forgotPassword');
  };

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

  // Get Apollo Client lazily (only when needed)
  const client = getApolloClient();

  // If Apollo Client failed to load, show SplashScreen anyway (without Apollo)
  // This helps debug if Apollo Client is the issue
  if (!client) {
    return (
      <ErrorBoundary>
        <SplashScreen onFinish={handleSplashFinish} />
      </ErrorBoundary>
    );
  }

  return (
    <ApolloProvider client={client}>
      {currentView === 'splash' ? (
        <SplashScreen onFinish={handleSplashFinish} />
      ) : currentView === 'signup' ? (
        <SignUpScreen
          resumeUserId={signupResume?.userId}
          resumeVerificationStatus={signupResume?.verificationStatus}
        />
      ) : currentView === 'forgotPassword' ? (
        <ForgotPasswordScreen onBackToLogin={handleBackToLogin} />
      ) : (
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onForgotPassword={handleForgotPassword}
          onSignUp={handleSignUp}
        />
      )}
    </ApolloProvider>
  );
};

export default App;
