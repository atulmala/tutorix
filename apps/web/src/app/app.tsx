import { useState, useEffect } from 'react';
import { useLazyQuery, useApolloClient, useMutation } from '@apollo/client';
import { GET_MY_TUTOR_PROFILE, HEARTBEAT } from '@tutorix/shared-graphql';
import { removeAuthToken } from '@tutorix/shared-graphql/client/web/token-storage';
import { HomeScreen } from './components/HomeScreen';
import { SignUp } from './components/sign-up/SignUp';
import { Login } from './components/Login';
import { ForgotPassword } from './components/ForgotPassword';
import { ResetPassword } from './components/ResetPassword';
import { PasswordResetAcknowledgement } from './components/PasswordResetAcknowledgement';
import { TutorOnboarding } from './components/tutor-onboarding';
import { TutorProfilePage } from './components/tutor-profile/TutorProfilePage';
import { AppHeader } from './components/AppHeader';

type View =
  | 'home'
  | 'signup'
  | 'login'
  | 'forgot-password'
  | 'reset-password'
  | 'password-reset-ack'
  | 'tutor-onboarding'
  | 'tutor-profile';

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
  const [signupSuccessMessage, setSignupSuccessMessage] = useState<string | null>(null);

  const apolloClient = useApolloClient();
  const [heartbeatMutation] = useMutation(HEARTBEAT);

  useEffect(() => {
    if (!currentUser) return;
    const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000;
    const sendHeartbeat = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        heartbeatMutation().catch(() => {
          /* ignore heartbeat errors */
        });
      }
    };
    sendHeartbeat();
    const id = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [currentUser, heartbeatMutation]);

  // Wrapper to log all view changes
  const setCurrentView = (view: View) => {
    console.log(`[App] View change: ${currentView} -> ${view}`);
    setCurrentViewInternal(view);
  };

  const [fetchMyTutorProfile] = useLazyQuery(GET_MY_TUTOR_PROFILE, {
    fetchPolicy: 'network-only',
  });

  const routeTutorAfterProfile = (tutor: {
    onBoardingComplete?: boolean;
    onboardingCelebrationSeen?: boolean;
    certificationStage?: string | null;
  } | null | undefined, source: string) => {
    // #region agent log
    fetch('http://127.0.0.1:7676/ingest/864fd570-d922-464e-bce0-8023d73126b8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7291db'},body:JSON.stringify({sessionId:'7291db',location:'app.tsx:routeTutorAfterProfile',message:'route_decision',data:{source,hasTutor:!!tutor,onBoardingComplete:tutor?.onBoardingComplete,onboardingCelebrationSeen:tutor?.onboardingCelebrationSeen,certificationStage:tutor?.certificationStage},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    if (!tutor) {
      console.log('[App] No tutor profile, going home');
      setTutorProfileForOnboarding(null);
      setCurrentView('home');
      return;
    }

    const onboardingComplete = tutor.onBoardingComplete === true;
    const celebrationSeen = tutor.onboardingCelebrationSeen === true;
    console.log(
      '[App] onBoardingComplete:',
      onboardingComplete,
      'celebrationSeen:',
      celebrationSeen,
      'certificationStage:',
      tutor.certificationStage,
    );

    if (!onboardingComplete) {
      setTutorProfileForOnboarding({
        certificationStage: tutor.certificationStage ?? undefined,
      });
      setCurrentView('tutor-onboarding');
    } else if (!celebrationSeen) {
      setTutorProfileForOnboarding({ certificationStage: 'complete' });
      setCurrentView('tutor-onboarding');
    } else {
      setTutorProfileForOnboarding(null);
      setCurrentView('tutor-profile');
    }
  };


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
    setSignupSuccessMessage(null);
    if (userId && verificationStatus) {
      setResumeUserId(userId);
      setResumeVerificationStatus(verificationStatus);
    } else {
      setResumeUserId(undefined);
      setResumeVerificationStatus(undefined);
    }
    setCurrentView('signup');
  };

  const handleSignUpSuccess = () => {
    setSignupSuccessMessage(
      'You have successfully signed up. Please login and start your onboarding process!'
    );
    setResumeUserId(undefined);
    setResumeVerificationStatus(undefined);
    setCurrentView('home');
  };

  const handleLogin = () => {
    setSignupSuccessMessage(null);
    setCurrentView('login');
  };

  const handleLoginSuccess = async (user?: { id: number; role?: string; firstName?: string; lastName?: string; email?: string }) => {
    if (user) {
      setCurrentUser({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      });
    }

    const role = user?.role != null ? String(user.role).toUpperCase() : '';
    const isTutor = role === 'TUTOR';

    // #region agent log
    fetch('http://127.0.0.1:7676/ingest/864fd570-d922-464e-bce0-8023d73126b8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7291db'},body:JSON.stringify({sessionId:'7291db',location:'app.tsx:handleLoginSuccess',message:'login_success',data:{userId:user?.id,role,isTutor},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (!isTutor) {
      setCurrentView('home');
      return;
    }

    try {
      const { data, error } = await fetchMyTutorProfile();
      // #region agent log
      fetch('http://127.0.0.1:7676/ingest/864fd570-d922-464e-bce0-8023d73126b8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7291db'},body:JSON.stringify({sessionId:'7291db',location:'app.tsx:handleLoginSuccess',message:'profile_query_done',data:{hasData:!!data,hasError:!!error,errorMessage:error?.message?.slice(0,200),hasTutor:!!data?.myTutorProfile},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      if (error) {
        console.error('Error fetching tutor profile:', error);
        setCurrentView('home');
        return;
      }
      routeTutorAfterProfile(data?.myTutorProfile, 'login');
    } catch (err) {
      console.error('Error fetching tutor profile:', err);
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
    setTutorProfileForOnboarding(null);
    setCurrentView('tutor-profile');
  };

  if (currentView === 'signup') {
    return (
      <div className="min-h-screen bg-subtle text-primary">
        <AppHeader currentUser={currentUser} onLogout={handleLogout} />
        <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
          <SignUp 
            onBackHome={handleBackHome} 
            onLogin={handleLogin}
            onSignUpSuccess={handleSignUpSuccess}
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
            onComplete={handleOnboardingComplete}
          />
        </main>
      </div>
    );
  }

  if (currentView === 'tutor-profile') {
    return (
      <div className="min-h-screen bg-subtle text-primary">
        <AppHeader currentUser={currentUser} onLogout={handleLogout} />
        <main className="mx-auto flex min-h-screen max-w-6xl justify-center px-4 py-10">
          <TutorProfilePage />
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

  return (
    <HomeScreen
      onLogin={handleLogin}
      onSignUp={handleSignUp}
      currentUser={currentUser}
      onLogout={handleLogout}
      signupSuccessMessage={signupSuccessMessage}
      onDismissSignupMessage={() => setSignupSuccessMessage(null)}
    />
  );
}

export default App;
