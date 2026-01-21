import React, { useState, useEffect } from 'react';

// CRITICAL: Ensure React is available globally BEFORE importing Apollo Client
// Apollo Client's context.cjs uses React.useContext internally, and if React
// is null or from a different instance, it will fail with "Cannot read property 'useContext' of null"
if (typeof global !== 'undefined') {
  if (!global.React) {
    global.React = React;
    console.log('[App.tsx] 🔧 Set global.React before Apollo Client import');
  } else if (global.React !== React) {
    console.warn('[App.tsx] ⚠️ global.React differs, updating to match imported React');
    global.React = React;
  }
}

// Import ApolloProvider directly from @apollo/client to avoid potential wrapper issues
import { ApolloProvider, ApolloClient, NormalizedCacheObject } from '@apollo/client';
// Import from mobile-specific client to avoid Metro bundler parsing web client (import.meta)
import { apolloClient } from '@tutorix/shared-graphql/client/mobile';
import { SplashScreen } from './components/SplashScreen';
import { LoginScreen } from './components/LoginScreen';
import { ForgotPasswordScreen } from './components/ForgotPasswordScreen';
import { SignUpScreen } from './components/sign-up/SignUpScreen';

type View = 'splash' | 'login' | 'forgotPassword' | 'signup';

/**
 * App component wrapped with ApolloProvider directly
 * 
 * IMPORTANT: We use ApolloProvider directly (not GraphQLProvider wrapper) because:
 * - GraphQLProvider wrapper causes "Invalid hook call" and "Cannot read property 'useContext' of null" errors in React Native
 * - This is a known issue with wrapper components in React Native's context system
 * - Using ApolloProvider directly works perfectly and is the recommended approach for React Native
 * 
 * Note: Unlike web apps where providers are wrapped in main.tsx using ReactDOM,
 * React Native's AppRegistry.registerComponent() expects a component function,
 * so we wrap the provider here in the App component itself.
 * 
 * Web apps can use GraphQLProvider wrapper without issues, but mobile must use ApolloProvider directly.
 */
export const App = () => {
  console.log('[App] 🚀 App component function called');
  console.log('[App] React available at function start:', typeof React !== 'undefined');
  console.log('[App] React.useState available:', typeof React?.useState === 'function');
  console.log('[App] React.useEffect available:', typeof React?.useEffect === 'function');
  
  const [currentView, setCurrentView] = useState<View>('splash');
  console.log('[App] ✅ useState called successfully, currentView:', currentView);
  
  const [signupResume, setSignupResume] = useState<{
    userId?: number;
    verificationStatus?: { isMobileVerified: boolean; isEmailVerified: boolean };
  } | null>(null);
  console.log('[App] ✅ Second useState called successfully');

  const handleSplashFinish = () => {
    setCurrentView('login');
  };

  const handleLoginSuccess = () => {
    // TODO: Navigate to home/dashboard after successful login
    console.log('Login successful - navigate to home/dashboard');
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

  // Verify Apollo Client has been successfully created on component mount
  console.log('[App] 📝 About to call useEffect...');
  useEffect(() => {
    console.log('[App] 🔍 Checking Apollo Client initialization...');
    console.log('[App] Apollo Client instance:', apolloClient);
    console.log('[App] Apollo Client type:', typeof apolloClient);
    console.log('[App] Apollo Client has link:', !!apolloClient?.link);
    console.log('[App] Apollo Client has cache:', !!apolloClient?.cache);
    
    if (!apolloClient) {
      console.error('[App] ❌ Apollo Client is null or undefined!');
    } else if (!apolloClient.link) {
      console.error('[App] ❌ Apollo Client link is missing!');
    } else if (!apolloClient.cache) {
      console.error('[App] ❌ Apollo Client cache is missing!');
    } else {
      console.log('[App] ✅ Apollo Client successfully initialized and ready');
      console.log('[App] Apollo Client cache type:', apolloClient.cache?.constructor?.name);
      console.log('[App] Apollo Client link type:', apolloClient.link?.constructor?.name);
    }
  }, []);

  // Check if React is properly initialized before rendering ApolloProvider
  // This prevents "Cannot read property 'useContext' of null" errors
  if (typeof React === 'undefined' || !React.useContext) {
    console.error('[App] ❌ React is not properly initialized!');
    console.error('[App] React type:', typeof React);
    console.error('[App] React.useContext:', typeof React?.useContext);
    return null;
  } else {
    console.log('[App] ✅ React is properly initialized');
    console.log('[App] React version:', React.version);
    console.log('[App] React.useContext available:', typeof React.useContext === 'function');
  }

  // CRITICAL: Ensure React is available globally for Apollo Client's internal use
  // Apollo Client's context.cjs uses React.useContext internally, and if it imports
  // React from a different instance, React will be null
  // This ensures Apollo Client uses the same React instance
  if (typeof global !== 'undefined') {
    if (!global.React) {
      global.React = React;
      console.log('[App] 🔧 Set global.React to ensure Apollo Client uses same instance');
    } else {
      console.log('[App] ℹ️ global.React already exists');
      // Verify it's the same instance
      if (global.React !== React) {
        console.warn('[App] ⚠️ global.React is different from imported React!');
        global.React = React; // Force same instance
      }
    }
  }

  // Type assertion to handle potential multiple @apollo/client instances during Metro bundling
  // Metro config should resolve to single instance, but this ensures compatibility
  return (
    <ApolloProvider client={apolloClient as unknown as ApolloClient<NormalizedCacheObject>}>
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
