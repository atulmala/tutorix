import { useState, useEffect } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { SignUp } from './components/sign-up/SignUp';
import { Login } from './components/Login';
import { ForgotPassword } from './components/ForgotPassword';
import { ResetPassword } from './components/ResetPassword';
import { PasswordResetAcknowledgement } from './components/PasswordResetAcknowledgement';

type View = 'home' | 'signup' | 'login' | 'forgot-password' | 'reset-password' | 'password-reset-ack';

export function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [resumeUserId, setResumeUserId] = useState<number | undefined>(undefined);
  const [resumeVerificationStatus, setResumeVerificationStatus] = useState<{ isMobileVerified: boolean; isEmailVerified: boolean } | undefined>(undefined);
  const [resetPasswordToken, setResetPasswordToken] = useState<string | undefined>(undefined);

  // Check for reset password token in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      // If token exists in URL, navigate to reset password view
      setResetPasswordToken(token);
      setCurrentView('reset-password');
      // Clean up URL (remove token from query string) after a short delay to ensure state is set
      setTimeout(() => {
        window.history.replaceState({}, '', window.location.pathname);
      }, 100);
    }
  }, []);

  const handleBackHome = () => {
    setCurrentView('home');
    // Clear resume state when going back to home
    setResumeUserId(undefined);
    setResumeVerificationStatus(undefined);
    setResetPasswordToken(undefined);
  };

  const handleSignUp = (userId?: number, verificationStatus?: { isMobileVerified: boolean; isEmailVerified: boolean }) => {
    if (userId && verificationStatus) {
      // Resuming from login - set resume state
      setResumeUserId(userId);
      setResumeVerificationStatus(verificationStatus);
    } else {
      // New signup - clear resume state
      setResumeUserId(undefined);
      setResumeVerificationStatus(undefined);
    }
    setCurrentView('signup');
  };

  const handleLogin = () => {
    setCurrentView('login');
  };

  const handleLoginSuccess = () => {
    // TODO: Navigate to dashboard or home after successful login
    // For now, just go back to home
    setCurrentView('home');
  };

  const handleForgotPassword = () => {
    setCurrentView('forgot-password');
  };

  const handlePasswordResetSuccess = () => {
    setCurrentView('password-reset-ack');
    setResetPasswordToken(undefined);
  };

  if (currentView === 'signup') {
    return (
      <div className="min-h-screen bg-subtle text-primary">
        <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
          <SignUp 
            onBackHome={handleBackHome} 
            onLogin={handleLogin}
            resumeUserId={resumeUserId}
            resumeVerificationStatus={resumeVerificationStatus}
          />
        </main>
      </div>
    );
  }

  if (currentView === 'login') {
    return (
      <div className="min-h-screen bg-subtle text-primary">
        <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
          <Login 
            onBackHome={handleBackHome} 
            onSignUp={handleSignUp} 
            onLoginSuccess={handleLoginSuccess}
            onForgotPassword={handleForgotPassword}
          />
        </main>
      </div>
    );
  }

  if (currentView === 'forgot-password') {
    return (
      <div className="min-h-screen bg-subtle text-primary">
        <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
          <ForgotPassword 
            onBackHome={handleBackHome} 
            onBackToLogin={() => setCurrentView('login')}
          />
        </main>
      </div>
    );
  }

  if (currentView === 'reset-password') {
    return (
      <div className="min-h-screen bg-subtle text-primary">
        <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
          <ResetPassword 
            token={resetPasswordToken}
            onSuccess={handlePasswordResetSuccess}
            onBackHome={handleBackHome}
          />
        </main>
      </div>
    );
  }

  if (currentView === 'password-reset-ack') {
    return (
      <div className="min-h-screen bg-subtle text-primary">
        <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
          <PasswordResetAcknowledgement 
            onBackHome={handleBackHome}
            onLogin={handleLogin}
          />
        </main>
      </div>
    );
  }

  return <HomeScreen onLogin={handleLogin} onSignUp={handleSignUp} />;
}

export default App;
