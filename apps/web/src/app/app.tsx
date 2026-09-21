import { useState, useEffect, useRef, useCallback } from 'react';
import { useLazyQuery, useMutation } from '@apollo/client';
import { GET_MY_STUDENT_PROFILE, GET_MY_TUTOR_DETAIL, GET_MY_TUTOR_PROFILE, HEARTBEAT } from '@tutorix/shared-graphql';
import { HomeScreen } from './components/HomeScreen';
import { AudienceDetailPage } from './components/home/AudienceDetailPage';
import { studentDetailCopy, tutorDetailCopy } from './components/home/audience-detail-copy';
import { SignUp } from './components/sign-up/SignUp';
import { Login } from './components/Login';
import { ForgotPassword } from './components/ForgotPassword';
import { ResetPassword } from './components/ResetPassword';
import { PasswordResetAcknowledgement } from './components/PasswordResetAcknowledgement';
import { TutorOnboarding } from './components/tutor-onboarding';
import { TutorHomePage } from './components/tutor-home';
import { TutorBankSetupPage } from './components/tutor-bank-setup';
import {
  TutorRateCardSetupPage,
  confirmRateCardLater,
} from './components/tutor-rate-card-setup';
import { TutorCalendarPage } from './components/tutor-calendar';
import { TutorProfilePage } from './components/tutor-profile/TutorProfilePage';
import { StudentOnboarding } from './components/student-onboarding';
import { StudentHomePage } from './components/student-home';
import { StudentProfilePage } from './components/student-profile';
import { StudentTutorSearchPage } from './components/student-tutor-search/StudentTutorSearchPage';
import { clearStudentTutorSearchDraft } from './components/student-tutor-search/student-tutor-search-draft';
import { StudentTutorPreviewPage } from './components/student-tutor-preview/StudentTutorPreviewPage';
import { AppHeader } from './components/AppHeader';
import { WalletPage } from './components/wallet';
import { AnalyticsViewTracker } from '../components/AnalyticsViewTracker';
import { WebAuthProvider, useWebAuth } from './auth/useWebAuth';
import type { WebUser } from './types/web-user';
import { SessionLoadingGate } from './auth/SessionLoadingGate';
import { LegalPage } from './components/LegalPage';
import {
  studentViewAfterProfile,
  tutorViewAfterProfile,
  type WalletReturnView,
  type WebView,
} from './web-navigation';
import { ALREADY_REGISTERED_LOGIN_MESSAGE, isBankDetailsMarkedComplete, needsRateCardSetup } from '@tutorix/shared-utils';

function AppContent() {
  const { user: currentUser, refreshUser, logout } = useWebAuth();
  const [currentView, setCurrentViewInternal] = useState<WebView>('home');
  const [walletReturnView, setWalletReturnView] =
    useState<WalletReturnView>('tutor-home');
  const [tutorPreview, setTutorPreview] = useState<{
    tutorId: string;
    offeringId: string;
  } | null>(null);
  const [resumeUserId, setResumeUserId] = useState<number | undefined>(undefined);
  const [resumeVerificationStatus, setResumeVerificationStatus] = useState<
    | {
        isMobileVerified: boolean;
        isEmailVerified: boolean;
        mobileVerificationRequired?: boolean;
      }
    | undefined
  >(undefined);
  const [resetPasswordToken, setResetPasswordToken] = useState<string | undefined>(undefined);
  const [tutorProfileForOnboarding, setTutorProfileForOnboarding] = useState<{ certificationStage?: string } | null>(null);
  const [studentProfileForOnboarding, setStudentProfileForOnboarding] = useState<{ onboardingStage?: string } | null>(null);
  const [signupSuccessMessage, setSignupSuccessMessage] = useState<string | null>(null);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [rateCardCanDefer, setRateCardCanDefer] = useState(false);

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

  const setCurrentView = useCallback((view: WebView) => {
    console.log(`[App] View change: ${currentViewRef.current} -> ${view}`);
    setCurrentViewInternal(view);
  }, []);

  const [fetchMyTutorProfile] = useLazyQuery(GET_MY_TUTOR_PROFILE, {
    fetchPolicy: 'network-only',
  });

  const [fetchMyTutorDetail] = useLazyQuery(GET_MY_TUTOR_DETAIL, {
    fetchPolicy: 'network-only',
  });

  const [fetchMyStudentProfile] = useLazyQuery(GET_MY_STUDENT_PROFILE, {
    fetchPolicy: 'network-only',
  });

  const routeTutorAfterProfile = useCallback((tutor: {
    onBoardingComplete?: boolean;
    onboardingCelebrationSeen?: boolean;
    bankDetailsComplete?: boolean;
    needsRateCardSetup?: boolean;
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

    const nextView = tutorViewAfterProfile(tutor);
    if (nextView === 'tutor-onboarding') {
      setTutorProfileForOnboarding({
        certificationStage: !onboardingComplete
          ? (tutor.certificationStage ?? undefined)
          : 'complete',
      });
    } else {
      setTutorProfileForOnboarding(null);
    }
    setCurrentView(nextView);
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

    const nextView = studentViewAfterProfile(student);
    if (nextView === 'student-onboarding') {
      setStudentProfileForOnboarding({
        onboardingStage: student.onboardingStage ?? undefined,
      });
    } else {
      setStudentProfileForOnboarding(null);
    }
    setCurrentView(nextView);
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
      const tutor = data?.myTutorProfile;
      if (tutor?.onBoardingComplete && tutor.onboardingCelebrationSeen) {
        let bankDetailsComplete = tutor.bankDetailsComplete === true;
        let rateCardSetupNeeded = false;
        try {
          const detailResult = await fetchMyTutorDetail();
          if (detailResult.data?.myTutorDetail) {
            bankDetailsComplete = isBankDetailsMarkedComplete(
              detailResult.data.myTutorDetail.user?.bankDetails,
            );
            rateCardSetupNeeded = needsRateCardSetup(
              detailResult.data.myTutorDetail.offerings,
            );
          }
        } catch (err) {
          console.error('Error fetching tutor setup details:', err);
        }
        routeTutorAfterProfile({
          ...tutor,
          bankDetailsComplete,
          needsRateCardSetup: rateCardSetupNeeded,
        });
        return;
      }
      routeTutorAfterProfile(tutor);
    } catch (err) {
      console.error('Error fetching tutor profile:', err);
      setCurrentView('home');
    }
  }, [fetchMyStudentProfile, fetchMyTutorDetail, fetchMyTutorProfile, routeStudentAfterProfile, routeTutorAfterProfile, setCurrentView]);

  const handleOpenWallet = useCallback((from: WalletReturnView) => {
    if (currentViewRef.current === 'tutor-bank-setup' || currentViewRef.current === 'tutor-rate-card-setup') {
      return;
    }
    setWalletReturnView(from);
    setCurrentView('wallet');
  }, [setCurrentView]);

  const handleWalletBack = useCallback(() => {
    setCurrentView(walletReturnView);
  }, [setCurrentView, walletReturnView]);

  // Check for reset password token in URL on mount (takes precedence over session restore)
  useEffect(() => {
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    if (path === '/privacy') {
      skipSessionRestoreRef.current = true;
      setCurrentViewInternal('privacy');
    } else if (path === '/terms') {
      skipSessionRestoreRef.current = true;
      setCurrentViewInternal('terms');
    } else if (path === '/students') {
      skipSessionRestoreRef.current = true;
      setCurrentViewInternal('for-students');
    } else if (path === '/tutors') {
      skipSessionRestoreRef.current = true;
      setCurrentViewInternal('for-tutors');
    } else {
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
    }

    const onPopState = () => {
      const nextPath = window.location.pathname.replace(/\/$/, '') || '/';
      if (nextPath === '/students') {
        setCurrentViewInternal('for-students');
        return;
      }
      if (nextPath === '/tutors') {
        setCurrentViewInternal('for-tutors');
        return;
      }
      if (nextPath === '/' || nextPath === '') {
        setCurrentViewInternal('home');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
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
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    if (path === '/students' || path === '/tutors') {
      window.history.pushState({}, '', '/');
    }
  };

  const handleForStudents = () => {
    setCurrentView('for-students');
    window.history.pushState({}, '', '/students');
  };

  const handleForTutors = () => {
    setCurrentView('for-tutors');
    window.history.pushState({}, '', '/tutors');
  };

  const handleSignUp = (
    userId?: number,
    verificationStatus?: {
      isMobileVerified: boolean;
      isEmailVerified: boolean;
      mobileVerificationRequired?: boolean;
    }
  ) => {
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
    setLoginNotice(null);
    setCurrentView('login');
  };

  const handleAlreadyRegistered = () => {
    setSignupSuccessMessage(null);
    setLoginNotice(ALREADY_REGISTERED_LOGIN_MESSAGE);
    setCurrentView('login');
  };

  const handleLoginNoticeConsumed = useCallback(() => {
    setLoginNotice(null);
  }, []);

  const handleLoginSuccess = async (user?: { id: number; role?: string; firstName?: string; lastName?: string; email?: string }) => {
    const refreshed = await refreshUser();
    const routeUser = refreshed ?? user;

    hasRoutedBootstrapRef.current = true;
    setSessionRestorePhase('routing');
    await routeAfterAuthenticatedUser(routeUser);
    setSessionRestorePhase('done');
  };

  const handleLogout = async () => {
    console.log('[App] Logout initiated');

    await logout();

    setTutorProfileForOnboarding(null);
    setStudentProfileForOnboarding(null);
    setTutorPreview(null);
    clearStudentTutorSearchDraft();
    setResumeUserId(undefined);
    setResumeVerificationStatus(undefined);
    setResetPasswordToken(undefined);
    hasRoutedBootstrapRef.current = false;
    setSessionRestorePhase('idle');

    setCurrentView('home');
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    if (path === '/students' || path === '/tutors') {
      window.history.pushState({}, '', '/');
    }

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

  const handleOnboardingComplete = async () => {
    setTutorProfileForOnboarding(null);
    try {
      await routeAfterAuthenticatedUser(currentUser);
    } catch {
      setCurrentView('tutor-bank-setup');
    }
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
        <div className="flex min-h-screen items-center justify-center bg-[#e9f5fe]">
          <img src="/tutorix-logo.png" alt="Tutorix" className="h-40 w-auto" />
        </div>
      </>
    );
  }

  const content = (() => {
  if (currentView === 'student-onboarding') {
    return (
      <div className="min-h-screen bg-subtle text-primary">
        <AppHeader onLogout={handleLogout} />
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
      <div className="min-h-screen bg-[#e8f4ff] text-primary">
        <AppHeader
          onLogout={handleLogout}
          onProfilePress={() => setCurrentView('student-profile')}
          onOpenWallet={() => handleOpenWallet('student-home')}
          profileAlign="right"
          flush
        />
        <main className="mx-auto flex min-h-screen max-w-6xl justify-center px-4 py-8">
          <StudentHomePage
            onOpenTutorSearch={() => {
              clearStudentTutorSearchDraft();
              setCurrentView('student-tutor-search');
            }}
          />
        </main>
      </div>
    );
  }

  if (
    currentView === 'student-tutor-search' ||
    (currentView === 'student-tutor-preview' && tutorPreview)
  ) {
    const onSearch = currentView === 'student-tutor-search';
    return (
      <div className="min-h-screen bg-subtle text-primary">
        <AppHeader
          title={onSearch ? 'Search' : 'Tutor'}
          onLogout={handleLogout}
          onBack={() =>
            setCurrentView(onSearch ? 'student-home' : 'student-tutor-search')
          }
          onOpenWallet={() => handleOpenWallet('student-home')}
        />
        <main className="mx-auto flex min-h-screen max-w-6xl justify-center px-4 py-10">
          <div className={onSearch ? 'w-full' : 'hidden'}>
            <StudentTutorSearchPage
              onOpenTutorPreview={(tutorId, offeringId) => {
                setTutorPreview({ tutorId, offeringId });
                setCurrentView('student-tutor-preview');
              }}
            />
          </div>
          {!onSearch && tutorPreview ? (
            <StudentTutorPreviewPage
              tutorId={tutorPreview.tutorId}
              offeringId={tutorPreview.offeringId}
            />
          ) : null}
        </main>
      </div>
    );
  }

  if (currentView === 'student-profile') {
    return (
      <div className="min-h-screen bg-subtle text-primary">
        <AppHeader
          title="My profile"
          onLogout={handleLogout}
          onBack={() => setCurrentView('student-home')}
          onOpenWallet={() => handleOpenWallet('student-profile')}
        />
        <main className="mx-auto flex min-h-screen max-w-6xl justify-center px-4 py-10">
          <StudentProfilePage />
        </main>
      </div>
    );
  }

  if (currentView === 'wallet') {
    return (
      <div className="min-h-screen bg-subtle text-primary">
        <AppHeader
          title="Wallet"
          onLogout={handleLogout}
          onBack={handleWalletBack}
          onOpenWallet={() => undefined}
        />
        <main className="mx-auto flex min-h-screen max-w-6xl justify-center px-4 py-10">
          <WalletPage onBack={handleWalletBack} />
        </main>
      </div>
    );
  }

  if (currentView === 'signup') {
    return (
      <div className="min-h-screen bg-subtle text-primary">
        <AppHeader onLogout={handleLogout} />
        <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
          <SignUp 
            onBackHome={handleBackHome} 
            onLogin={handleLogin}
            onAlreadyRegistered={handleAlreadyRegistered}
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
        <AppHeader onLogout={handleLogout} />
        <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
          <TutorOnboarding 
            initialProfile={tutorProfileForOnboarding}
            onComplete={handleOnboardingComplete}
          />
        </main>
      </div>
    );
  }

  if (currentView === 'tutor-bank-setup') {
    return (
      <div className="min-h-screen bg-subtle text-primary">
        <AppHeader title="Account setup" onLogout={handleLogout} />
        <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
          <TutorBankSetupPage
            onComplete={() => {
              void routeAfterAuthenticatedUser(currentUser);
            }}
          />
        </main>
      </div>
    );
  }

  if (currentView === 'tutor-rate-card-setup') {
    return (
      <div className="min-h-screen bg-subtle text-primary">
        <AppHeader
          title="Rate card"
          onLogout={handleLogout}
          onBack={
            rateCardCanDefer
              ? () => confirmRateCardLater(() => setCurrentView('tutor-profile'))
              : undefined
          }
        />
        <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
          <TutorRateCardSetupPage
            onComplete={() => setCurrentView('tutor-home')}
            onLater={() => setCurrentView('tutor-profile')}
            onDeferChange={setRateCardCanDefer}
          />
        </main>
      </div>
    );
  }

  if (currentView === 'tutor-home') {
    return (
      <div className="min-h-screen bg-[#e8f4ff] text-primary">
        <AppHeader
          title="Home"
          onLogout={handleLogout}
          onProfilePress={() => setCurrentView('tutor-profile')}
          onOpenWallet={() => handleOpenWallet('tutor-home')}
        />
        <main className="mx-auto flex min-h-screen max-w-6xl justify-center px-4 py-8">
          <TutorHomePage
            onSetRateCard={() => setCurrentView('tutor-rate-card-setup')}
            onUpdateCalendar={() => setCurrentView('tutor-calendar')}
          />
        </main>
      </div>
    );
  }

  if (currentView === 'tutor-calendar') {
    return (
      <div className="min-h-screen bg-subtle text-primary">
        <AppHeader
          title="Calendar"
          onLogout={handleLogout}
          onBack={() => setCurrentView('tutor-home')}
          onOpenWallet={() => handleOpenWallet('tutor-home')}
        />
        <main className="mx-auto flex min-h-screen max-w-6xl justify-center px-4 py-10">
          <TutorCalendarPage />
        </main>
      </div>
    );
  }

  if (currentView === 'tutor-profile') {
    return (
      <div className="min-h-screen bg-subtle text-primary">
        <AppHeader
          title="My profile"
          onLogout={handleLogout}
          onBack={() => setCurrentView('tutor-home')}
          onOpenWallet={() => handleOpenWallet('tutor-profile')}
        />
        <main className="mx-auto flex min-h-screen max-w-6xl justify-center px-4 py-10">
          <TutorProfilePage />
        </main>
      </div>
    );
  }

  if (currentView === 'privacy') {
    return <LegalPage kind="privacy" />;
  }

  if (currentView === 'terms') {
    return <LegalPage kind="terms" />;
  }

  if (currentView === 'for-students') {
    return (
      <AudienceDetailPage
        copy={studentDetailCopy}
        currentUser={currentUser}
        onHome={handleBackHome}
        onLogin={handleLogin}
        onSignUp={handleSignUp}
        onLogout={handleLogout}
      />
    );
  }

  if (currentView === 'for-tutors') {
    return (
      <AudienceDetailPage
        copy={tutorDetailCopy}
        currentUser={currentUser}
        onHome={handleBackHome}
        onLogin={handleLogin}
        onSignUp={handleSignUp}
        onLogout={handleLogout}
      />
    );
  }

  if (currentView === 'login') {
    return (
      <div className="min-h-screen bg-subtle text-primary">
        <AppHeader onLogout={handleLogout} />
        <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
          <Login 
            onBackHome={handleBackHome} 
            onSignUp={handleSignUp} 
            onLoginSuccess={handleLoginSuccess}
            onForgotPassword={handleForgotPassword}
            noticeMessage={loginNotice}
            onNoticeConsumed={handleLoginNoticeConsumed}
          />
        </main>
      </div>
    );
  }

  if (currentView === 'forgot-password') {
    return (
      <div className="min-h-screen bg-subtle text-primary">
        <AppHeader onLogout={handleLogout} />
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
        <AppHeader onLogout={handleLogout} />
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
        <AppHeader onLogout={handleLogout} />
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
      onStudentDetails={handleForStudents}
      onTutorDetails={handleForTutors}
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
