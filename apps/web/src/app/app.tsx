import { useState, useEffect, useRef, useCallback } from 'react';
import { useLazyQuery, useMutation } from '@apollo/client';
import { GET_MY_STUDENT_PROFILE, GET_MY_TUTOR_PROFILE, HEARTBEAT } from '@tutorix/shared-graphql';
import { HomeScreen } from './components/HomeScreen';
import { SignUp } from './components/sign-up/SignUp';
import { Login } from './components/Login';
import { ForgotPassword } from './components/ForgotPassword';
import { ResetPassword } from './components/ResetPassword';
import { PasswordResetAcknowledgement } from './components/PasswordResetAcknowledgement';
import { TutorOnboarding } from './components/tutor-onboarding';
import { TutorProfilePage } from './components/tutor-profile/TutorProfilePage';
import { StudentOnboarding } from './components/student-onboarding';
import { StudentHomePage } from './components/student-home';
import { AppHeader } from './components/AppHeader';
import { AnalyticsViewTracker } from '../components/AnalyticsViewTracker';
import { WebAuthProvider, useWebAuth } from './auth/useWebAuth';
import type { WebUser } from './types/web-user';
import { SessionLoadingGate } from './auth/SessionLoadingGate';

type View =
  | 'home'
  | 'signup'
  | 'login'
  | 'forgot-password'
  | 'reset-password'
  | 'password-reset-ack'
  | 'tutor-onboarding'
  | 'tutor-profile'
  | 'student-onboarding'
  | 'student-home';

function AppContent() {
  const { user: currentUser, setUser, logout } = useWebAuth();
  const [currentView, setCurrentViewInternal] = useState<View>('home');
  const [resumeUserId, setResumeUserId] = useState<number | undefined>(undefined);
  const [resumeVerificationStatus, setResumeVerificationStatus] = useState<{ isMobileVerified: boolean; isEmailVerified: boolean } | undefined>(undefined);
  const [resetPasswordToken, setResetPasswordToken] = useState<string | undefined>(undefined);
  const [tutorProfileForOnboarding, setTutorProfileForOnboarding] = useState<{ certificationStage?: string } | null>(null);
  const [studentProfileForOnboarding, setStudentProfileForOnboarding] = useState<{ onboardingStage?: string } | null>(null);
  const [signupSuccessMessage, setSignupSuccessMessage] = useState<string | null>(null);

  const skipSessionRestoreRef = useRef(false);
  const hasRoutedBootstrapRef = useRef(false);
  const [sessionRestorePhase, setSessionRestorePhase] = useState<
    'idle' | 'routing' | 'done'
  >('idle');

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

  const currentViewRef = useRef(currentView);
  currentViewRef.current = currentView;

  const setCurrentView = useCallback((view: View) => {
    console.log(`[App] View change: ${currentViewRef.current} -> ${view}`);
    setCurrentViewInternal(view);
  }, []);

  const [fetchMyTutorProfile] = useLazyQuery(GET_MY_TUTOR_PROFILE, {
    fetchPolicy: 'network-only',
  });

  const [fetchMyStudentProfile] = useLazyQuery(GET_MY_STUDENT_PROFILE, {
    fetchPolicy: 'network-only',
  });

  const routeTutorAfterProfile = useCallback((tutor: {
    onBoardingComplete?: boolean;
    onboardingCelebrationSeen?: boolean;
    certificationStage?: string | null;
  } | null | undefined) => {
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
  }, [setCurrentView]);

  const routeStudentAfterProfile = useCallback((student: {
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
      setCurrentView('student-onboarding');
    } else {
      setStudentProfileForOnboarding(null);
      setCurrentView('student-home');
    }
  }, [setCurrentView]);

  const routeAfterAuthenticatedUser = useCallback(async (user?: WebUser | null) => {
    const role = user?.role != null ? String(user.role).toUpperCase() : '';
    const isTutor = role === 'TUTOR';
    const isStudent = role === 'STUDENT';

    if (isStudent) {
      try {
        const { data, error } = await fetchMyStudentProfile();
        if (error) {
          console.error('Error fetching student profile:', error);
          setCurrentView('home');
          return;
        }
        routeStudentAfterProfile(data?.myStudentProfile);
      } catch (err) {
        console.error('Error fetching student profile:', err);
        setCurrentView('home');
      }
      return;
    }

    if (!isTutor) {
      setCurrentView('home');
      return;
    }

    try {
      const { data, error } = await fetchMyTutorProfile();
      if (error) {
        console.error('Error fetching tutor profile:', error);
        setCurrentView('home');
        return;
      }
      routeTutorAfterProfile(data?.myTutorProfile);
    } catch (err) {
      console.error('Error fetching tutor profile:', err);
      setCurrentView('home');
    }
  }, [fetchMyStudentProfile, fetchMyTutorProfile, routeStudentAfterProfile, routeTutorAfterProfile, setCurrentView]);

  // Check for reset password token in URL on mount (takes precedence over session restore)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      skipSessionRestoreRef.current = true;
      setResetPasswordToken(token);
      setCurrentViewInternal('reset-password');
      setTimeout(() => {
        window.history.replaceState({}, '', window.location.pathname);
      }, 100);
    }
  }, []);

  // Restore post-login view after session bootstrap
  useEffect(() => {
    if (skipSessionRestoreRef.current) return;
    if (!currentUser) {
      setSessionRestorePhase('idle');
      return;
    }
    if (hasRoutedBootstrapRef.current) return;

    hasRoutedBootstrapRef.current = true;
    setSessionRestorePhase('routing');
    void routeAfterAuthenticatedUser(currentUser).finally(() => {
      setSessionRestorePhase('done');
    });
  }, [currentUser, routeAfterAuthenticatedUser]);

  const handleBackHome = () => {
    setCurrentView('home');
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
      setUser({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      });
    }

    hasRoutedBootstrapRef.current = true;
    setSessionRestorePhase('routing');
    await routeAfterAuthenticatedUser(user);
    setSessionRestorePhase('done');
  };

  const handleLogout = async () => {
    console.log('[App] Logout initiated');

    await logout();

    setTutorProfileForOnboarding(null);
    setStudentProfileForOnboarding(null);
    setResumeUserId(undefined);
    setResumeVerificationStatus(undefined);
    setResetPasswordToken(undefined);
    hasRoutedBootstrapRef.current = false;
    setSessionRestorePhase('idle');

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

  const handleStudentOnboardingComplete = () => {
    setStudentProfileForOnboarding(null);
    setCurrentView('student-home');
  };

  const holdingForSessionRoute =
    !skipSessionRestoreRef.current &&
    currentUser != null &&
    sessionRestorePhase !== 'done';

  if (holdingForSessionRoute) {
    return (
      <>
        <AnalyticsViewTracker viewName="session-restore" />
        <div className="flex min-h-screen items-center justify-center bg-subtle text-primary">
          <p className="text-sm text-muted">Loading…</p>
        </div>
      </>
    );
  }

  const content = (() => {
  if (currentView === 'student-onboarding') {
    return (
      <div className="min-h-screen bg-subtle text-primary">
        <AppHeader currentUser={currentUser} onLogout={handleLogout} />
        <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
          <StudentOnboarding
            initialProfile={studentProfileForOnboarding}
            onComplete={handleStudentOnboardingComplete}
          />
        </main>
      </div>
    );
  }

  if (currentView === 'student-home') {
    return (
      <div className="min-h-screen bg-subtle text-primary">
        <AppHeader currentUser={currentUser} onLogout={handleLogout} />
        <main className="mx-auto flex min-h-screen max-w-6xl justify-center px-4 py-10">
          <StudentHomePage currentUser={currentUser} />
        </main>
      </div>
    );
  }

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
  })();

  return (
    <>
      <AnalyticsViewTracker viewName={currentView} />
      {content}
    </>
  );
}

export function App() {
  return (
    <WebAuthProvider>
      <SessionLoadingGate>
        <AppContent />
      </SessionLoadingGate>
    </WebAuthProvider>
  );
}

export default App;
