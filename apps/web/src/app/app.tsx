import { useState, useEffect } from 'react';
import { useLazyQuery } from '@apollo/client';
import { HomeScreen } from './components/HomeScreen';
import { SignUp } from './components/sign-up/SignUp';
import { Login } from './components/Login';
import { ForgotPassword } from './components/ForgotPassword';
import { ResetPassword } from './components/ResetPassword';
import { PasswordResetAcknowledgement } from './components/PasswordResetAcknowledgement';
import { TutorOnboarding } from './components/tutor-onboarding';
import { GET_MY_TUTOR_PROFILE } from '@tutorix/shared-graphql';

type View = 'home' | 'signup' | 'login' | 'forgot-password' | 'reset-password' | 'password-reset-ack' | 'tutor-onboarding';

export function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [resumeUserId, setResumeUserId] = useState<number | undefined>(undefined);
  const [resumeVerificationStatus, setResumeVerificationStatus] = useState<{ isMobileVerified: boolean; isEmailVerified: boolean } | undefined>(undefined);
  const [resetPasswordToken, setResetPasswordToken] = useState<string | undefined>(undefined);

  const [getMyTutorProfile] = useLazyQuery(GET_MY_TUTOR_PROFILE, {
    onCompleted: (data) => {
      const tutor = data?.myTutorProfile;
      
      // If tutor profile doesn't exist (user is not a tutor), go to home
      if (!tutor) {
        setCurrentView('home');
        return;
      }
      
      // Check if onboarding is complete
      const onboardingComplete = tutor?.onBoardingComplete;
      
      if (!onboardingComplete) {
        // Tutor needs onboarding (either doesn't exist or onboarding not complete)
        setCurrentView('tutor-onboarding');
      } else {
        // Tutor has completed onboarding, go to home/dashboard
        setCurrentView('home');
      }
    },
    onError: (error) => {
      console.error('Error fetching tutor profile:', error);
      // If error (e.g., network error), just go to home
      setCurrentView('home');
    },
    fetchPolicy: 'network-only',
  });

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

  const handleLoginSuccess = async (user?: { id: number; role: string }) => {
    // If user is a tutor, check if they need onboarding
    if (user?.role === 'TUTOR') {
      // Query tutor profile to check onboarding status
      getMyTutorProfile();
    } else {
      // TODO: Navigate to dashboard or home after successful login
      // For now, just go back to home
      setCurrentView('home');
    }
  };

  const handleForgotPassword = () => {
    setCurrentView('forgot-password');
  };

  const handlePasswordResetSuccess = () => {
    setCurrentView('password-reset-ack');
    setResetPasswordToken(undefined);
  };

  const handleTutorOnboarding = () => {
    setCurrentView('tutor-onboarding');
  };

  const handleOnboardingComplete = () => {
    // TODO: Navigate to tutor dashboard or home
    setCurrentView('home');
  };

  if (currentView === 'signup') {
    return (
      <div className="min-h-screen bg-subtle text-primary">
        <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
          <SignUp 
            onBackHome={handleBackHome} 
            onLogin={handleLogin}
            onTutorOnboarding={handleTutorOnboarding}
            resumeUserId={resumeUserId}
            resumeVerificationStatus={resumeVerificationStatus}
          />
        </main>
      </div>
    );
  }

  if (currentView === 'tutor-onboarding') {
    return (
      <div className="min-h-screen bg-subtle text-primary">
        <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
          <TutorOnboarding 
            onComplete={handleOnboardingComplete}
            onBack={handleBackHome}
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
