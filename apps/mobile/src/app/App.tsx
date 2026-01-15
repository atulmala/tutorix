import React, { useState } from 'react';
// Import ApolloProvider directly from @apollo/client to avoid potential wrapper issues
import { ApolloProvider, ApolloClient, NormalizedCacheObject } from '@apollo/client';
// Import from mobile-specific client to avoid Metro bundler parsing web client (import.meta)
import { apolloClient } from '@tutorix/shared-graphql/client/mobile';
import { SplashScreen } from './components/SplashScreen';
import { LoginScreen } from './components/LoginScreen';
import { ForgotPasswordScreen } from './components/ForgotPasswordScreen';

type View = 'splash' | 'login' | 'forgotPassword';

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
  const [currentView, setCurrentView] = useState<View>('splash');

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

  const handleBackToLogin = () => {
    setCurrentView('login');
  };

  // Type assertion to handle potential multiple @apollo/client instances during Metro bundling
  // Metro config should resolve to single instance, but this ensures compatibility
  return (
    <ApolloProvider client={apolloClient as unknown as ApolloClient<NormalizedCacheObject>}>
      {currentView === 'splash' ? (
        <SplashScreen onFinish={handleSplashFinish} />
      ) : currentView === 'forgotPassword' ? (
        <ForgotPasswordScreen onBackToLogin={handleBackToLogin} />
      ) : (
        <LoginScreen onLoginSuccess={handleLoginSuccess} onForgotPassword={handleForgotPassword} />
      )}
    </ApolloProvider>
  );
};

export default App;
