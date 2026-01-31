import { useState, useEffect } from 'react';
import { useLazyQuery, useApolloClient } from '@apollo/client';
import { GET_MY_TUTOR_PROFILE } from '@tutorix/shared-graphql';
import { removeAuthToken } from '@tutorix/shared-graphql/client/web/token-storage';
import { HomeScreen } from './components/HomeScreen';
import { SignUp } from './components/sign-up/SignUp';
import { Login } from './components/Login';
import { ForgotPassword } from './components/ForgotPassword';
import { ResetPassword } from './components/ResetPassword';
import { PasswordResetAcknowledgement } from './components/PasswordResetAcknowledgement';
import { TutorOnboarding } from './components/tutor-onboarding';
import { AppHeader } from './components/AppHeader';

type View = 'home' | 'signup' | 'login' | 'forgot-password' | 'reset-password' | 'password-reset-ack' | 'tutor-onboarding';

type User = {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
};

export function App() {
  const [currentView, setCurrentViewInternal] = useState<View>('home');
  const [resumeUserId, setResumeUserId] = useState<number | undefined>(undefined);
  const [resumeVerificationStatus, setResumeVerificationStatus] = useState<{ isMobileVerified: boolean; isEmailVerified: boolean } | undefined>(undefined);
  const [resetPasswordToken, setResetPasswordToken] = useState<string | undefined>(undefined);
  const [tutorProfileForOnboarding, setTutorProfileForOnboarding] = useState<{ certificationStage?: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const apolloClient = useApolloClient();

  // Wrapper to log all view changes
  const setCurrentView = (view: View) => {
    console.log(`[App] View change: ${currentView} -> ${view}`);
    setCurrentViewInternal(view);
  };

  const [getMyTutorProfile] = useLazyQuery(GET_MY_TUTOR_PROFILE, {
    onCompleted: (data) => {
      console.log('[App] getMyTutorProfile response:', data);
      const tutor = data?.myTutorProfile;
      
      // No tutor profile means something went wrong, go home
      if (!tutor) {
        console.log('[App] No tutor profile, going home');
        setTutorProfileForOnboarding(null);
        setCurrentView('home');
        return;
      }
      
      const onboardingComplete = tutor.onBoardingComplete;
      const hasAddress = tutor.addresses && tutor.addresses.length > 0;
      console.log('[App] onBoardingComplete:', onboardingComplete, 'Has address:', hasAddress, 'certificationStage:', tutor.certificationStage);
      
      // Only go home if onboarding is fully complete
      if (onboardingComplete) {
        console.log('[App] Onboarding complete, going home');
        setTutorProfileForOnboarding(null);
        setCurrentView('home');
      } else {
        // Pass profile (including certificationStage) so onboarding can show correct step immediately
        setTutorProfileForOnboarding({ certificationStage: tutor.certificationStage });
        console.log('[App] Onboarding incomplete, showing tutor-onboarding at stage:', tutor.certificationStage);
        setCurrentView('tutor-onboarding');
      }
    },
    onError: (error) => {
      console.error('Error fetching tutor profile:', error);
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
      setCurrentViewInternal('reset-password');
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

  const handleLoginSuccess = async (user?: { id: number; role?: string; firstName?: string; lastName?: string; email?: string }) => {
    // Store user info for displaying name in header
    if (user) {
      setCurrentUser({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      });
    }
    
    const isTutor = user?.role != null && String(user.role).toUpperCase() === 'TUTOR';
    if (isTutor) {
      getMyTutorProfile();
    } else {
      setCurrentView('home');
    }
  };

  const handleLogout = async () => {
    console.log('[App] Logout initiated');
    
    // 1. Clear auth tokens from localStorage
    await removeAuthToken();
    
    // 2. Clear Apollo cache
    await apolloClient.clearStore();
    
    // 3. Reset user state
    setCurrentUser(null);
    
    // 4. Reset all app state
    setTutorProfileForOnboarding(null);
    setResumeUserId(undefined);
    setResumeVerificationStatus(undefined);
    setResetPasswordToken(undefined);
    
    // 5. Redirect to home
    setCurrentView('home');
    
    console.log('[App] Logout complete');
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
        <AppHeader currentUser={currentUser} onLogout={handleLogout} />
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
        <AppHeader currentUser={currentUser} onLogout={handleLogout} />
        <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
          <TutorOnboarding 
            initialProfile={tutorProfileForOnboarding}
            onComplete={() => {
              setTutorProfileForOnboarding(null);
              handleOnboardingComplete();
            }}
            onBack={() => {
              setTutorProfileForOnboarding(null);
              handleBackHome();
            }}
          />
        </main>
      </div>
    );
  }

  if (currentView === 'login') {
    return (
      <div className="min-h-screen bg-subtle text-primary">
        <AppHeader currentUser={currentUser} onLogout={handleLogout} />
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
        <AppHeader currentUser={currentUser} onLogout={handleLogout} />
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
        <AppHeader currentUser={currentUser} onLogout={handleLogout} />
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
        <AppHeader currentUser={currentUser} onLogout={handleLogout} />
        <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
          <PasswordResetAcknowledgement 
            onBackHome={handleBackHome}
            onLogin={handleLogin}
          />
        </main>
      </div>
    );
  }

  return <HomeScreen onLogin={handleLogin} onSignUp={handleSignUp} currentUser={currentUser} onLogout={handleLogout} />;
}

export default App;
