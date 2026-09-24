import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import {
  ApolloProvider,
  useLazyQuery,
  useMutation,
  useApolloClient,
} from '@apollo/client';
import { SplashScreen } from './components/SplashScreen';
import { HomeScreen } from './components/HomeScreen';
import { LoginScreen } from './components/LoginScreen';
import { ForgotPasswordScreen } from './components/ForgotPasswordScreen';
import { SignUpScreen } from './components/sign-up/SignUpScreen';
import { TutorOnboarding } from './components/tutor-onboarding';
import { StudentOnboarding } from './components/student-onboarding';
import { StudentDetailScreen } from './components/student-profile/StudentDetailScreen';
import { StudentHomeScreen } from './components/student-home/StudentHomeScreen';
import { StudentTutorSearchScreen } from './components/student-tutor-search/StudentTutorSearchScreen';
import { StudentTutorSearchResultsScreen } from './components/student-tutor-search/StudentTutorSearchResultsScreen';
import type { StudentTutorSearchParams } from './components/student-tutor-search/student-tutor-search-params';
import { StudentTutorPreviewScreen } from './components/student-tutor-preview/StudentTutorPreviewScreen';
import { StudentTutorBookingScreen } from './components/student-tutor-booking/StudentTutorBookingScreen';
import { StudentTutorBookingConfirmScreen } from './components/student-tutor-booking/StudentTutorBookingConfirmScreen';
import {
  StudentHomeHeader,
  StudentNavHeader,
  StudentTabBar,
} from './components/student-nav';
import { TutorDetailScreen } from './components/tutor-profile/TutorDetailScreen';
import { TutorHomeScreen } from './components/tutor-home/TutorHomeScreen';
import { TutorBankSetupScreen } from './components/tutor-bank-setup/TutorBankSetupScreen';
import {
  TutorRateCardSetupScreen,
  confirmRateCardLater,
} from './components/tutor-rate-card-setup/TutorRateCardSetupScreen';
import { TutorCalendarScreen } from './components/tutor-calendar/TutorCalendarScreen';
import { TutorNavHeader } from './components/tutor-nav/TutorNavHeader';
import { WalletScreen } from './components/wallet';
import { NavHeader } from './components/NavHeader';
import {
  studentViewAfterProfile,
  tutorViewAfterProfile,
  walletReturnFromPush,
  type AppView,
  type WalletReturnView,
} from './student-navigation';
import { ErrorBoundary } from './components/ErrorBoundary';
import { createApolloClient } from '@tutorix/shared-graphql/client/mobile';
import {
  removeAuthToken,
  setAuthToken,
} from '@tutorix/shared-graphql/client/mobile/token-storage';
import { isBankDetailsMarkedComplete } from '@tutorix/shared-utils/bank-details-formatters';
import { needsRateCardSetup } from '@tutorix/shared-utils/rate-card';
import {
  isStudentBookingDraftReady,
  type StudentBookingDraft,
} from '@tutorix/shared-utils/student-booking';
import { ALREADY_REGISTERED_LOGIN_MESSAGE } from '@tutorix/shared-utils/already-registered';
import { GET_MY_STUDENT_PROFILE, GET_MY_TUTOR_DETAIL, GET_MY_TUTOR_PROFILE } from '@tutorix/shared-graphql/queries';
import { LOGIN } from '@tutorix/shared-graphql/mutations';
import {
  registerPushNotifications,
  unregisterPushNotifications,
  subscribeForegroundPush,
  subscribeNotificationOpened,
  consumeInitialNotification,
  shouldOpenWallet,
  type PushPayload,
} from '../lib/push-notifications';
import { clearBiometricToken } from './lib/biometric-auth';
import { AnalyticsViewTracker } from '../components/AnalyticsViewTracker';
import { FeatureFlagsProvider } from './feature-flags/FeatureFlagsContext';
import { AppUpdateGate } from './components/AppUpdateGate';
import { BRAND_NAME } from './config';

const notificationIcon = require('../assets/tutorix-icon.png');

/** Align with createApolloClient's package types (avoids dual @apollo/client installs). */
type AppApolloClient = ReturnType<typeof createApolloClient>;

let apolloClient: AppApolloClient | null = null;
let apolloClientError: Error | null = null;

function getApolloClient(): AppApolloClient | null {
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

export type { AppView, WalletReturnView };

const UNAUTHED_VIEWS: AppView[] = [
  'splash',
  'login',
  'forgotPassword',
  'signup',
];

function isAuthedView(view: AppView): boolean {
  return !UNAUTHED_VIEWS.includes(view);
}

function AppContent() {
  const apolloClient = useApolloClient();
  const [currentView, setCurrentView] = useState<AppView>('splash');
  const [walletReturnView, setWalletReturnView] =
    useState<WalletReturnView>('tutorHome');
  const [tutorCalendarReturnView, setTutorCalendarReturnView] =
    useState<AppView>('tutorHome');
  const [tutorProfileForOnboarding, setTutorProfileForOnboarding] = useState<{
    certificationStage?: string;
  } | null>(null);
  const [studentProfileForOnboarding, setStudentProfileForOnboarding] = useState<{
    onboardingStage?: string;
  } | null>(null);
  const [tutorPreview, setTutorPreview] = useState<{
    tutorId: string;
    offeringId: string;
  } | null>(null);
  const [bookingDraft, setBookingDraft] = useState<StudentBookingDraft | null>(null);
  const [tutorSearchParams, setTutorSearchParams] =
    useState<StudentTutorSearchParams | null>(null);
  const [signupResume, setSignupResume] = useState<{
    userId?: number;
    verificationStatus?: {
      isMobileVerified: boolean;
      isEmailVerified: boolean;
      mobileVerificationRequired?: boolean;
    };
  } | null>(null);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [rateCardCanDefer, setRateCardCanDefer] = useState(false);
  const [pushBanner, setPushBanner] = useState<PushPayload | null>(null);
  const currentViewRef = useRef(currentView);
  currentViewRef.current = currentView;
  const pushBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogout = useCallback(async () => {
    await unregisterPushNotifications(apolloClient);
    await clearBiometricToken();
    await removeAuthToken();
    await apolloClient.clearStore();
    setCurrentView('login');
    setTutorProfileForOnboarding(null);
    setStudentProfileForOnboarding(null);
    setTutorPreview(null);
    setTutorSearchParams(null);
    setSignupResume(null);
    setPushBanner(null);
    if (pushBannerTimerRef.current) {
      clearTimeout(pushBannerTimerRef.current);
      pushBannerTimerRef.current = null;
    }
  }, [apolloClient]);

  const openTutorCalendar = useCallback((returnTo: AppView) => {
    setTutorCalendarReturnView(returnTo);
    setCurrentView('tutorCalendar');
  }, []);

  const handleAccountDeleted = useCallback(async () => {
    await clearBiometricToken();
    await removeAuthToken();
    await apolloClient.clearStore();
    setCurrentView('login');
    setTutorProfileForOnboarding(null);
    setStudentProfileForOnboarding(null);
    setTutorPreview(null);
    setTutorSearchParams(null);
    setSignupResume(null);
    setPushBanner(null);
    if (pushBannerTimerRef.current) {
      clearTimeout(pushBannerTimerRef.current);
      pushBannerTimerRef.current = null;
    }
  }, [apolloClient]);

  const routeStudentAfterProfile = useCallback(
    (student: {
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
        setCurrentView('studentOnboarding');
      } else {
        setStudentProfileForOnboarding(null);
        setCurrentView(studentViewAfterProfile(student));
      }
    },
    [],
  );

  const [getMyTutorProfile] = useLazyQuery(GET_MY_TUTOR_PROFILE, {
    fetchPolicy: 'network-only',
  });
  const [getMyTutorDetail] = useLazyQuery(GET_MY_TUTOR_DETAIL, {
    fetchPolicy: 'network-only',
  });

  const routeLoggedInTutor = useCallback(async () => {
    try {
      const { data } = await getMyTutorProfile();
      const tutor = data?.myTutorProfile;
      if (!tutor) {
        setTutorProfileForOnboarding(null);
        setCurrentView('home');
        return;
      }
      if (!tutor.onBoardingComplete || !tutor.onboardingCelebrationSeen) {
        setTutorProfileForOnboarding({
          certificationStage: tutor.onBoardingComplete
            ? 'complete'
            : tutor.certificationStage,
        });
        setCurrentView('tutorOnboarding');
        return;
      }

      setTutorProfileForOnboarding(null);
      let bankDetailsComplete = tutor.bankDetailsComplete === true;
      let rateCardSetupNeeded = false;
      let needsWeeklyAvailabilitySetup = false;
      try {
        const detailResult = await getMyTutorDetail();
        const detail = detailResult.data?.myTutorDetail;
        if (detail) {
          bankDetailsComplete = isBankDetailsMarkedComplete(
            detail.user?.bankDetails,
          );
          rateCardSetupNeeded = needsRateCardSetup(detail.offerings);
          needsWeeklyAvailabilitySetup =
            detail.canSetAvailability === true &&
            detail.availabilityConfiguredAt == null;
        }
      } catch {
        rateCardSetupNeeded = false;
      }
      setCurrentView(
        tutorViewAfterProfile({
          onBoardingComplete: tutor.onBoardingComplete,
          onboardingCelebrationSeen: tutor.onboardingCelebrationSeen,
          bankDetailsComplete,
          needsRateCardSetup: rateCardSetupNeeded,
          needsWeeklyAvailabilitySetup,
        }),
      );
    } catch {
      setCurrentView('home');
    }
  }, [getMyTutorDetail, getMyTutorProfile]);

  const [getMyStudentProfile] = useLazyQuery(GET_MY_STUDENT_PROFILE, {
    onCompleted: (data) => {
      routeStudentAfterProfile(data?.myStudentProfile);
    },
    onError: () => {
      setCurrentView('home');
    },
    fetchPolicy: 'network-only',
  });

  const [loginMutation] = useMutation(LOGIN);

  const handleSplashFinish = () => setCurrentView('login');

  const handleLoginSuccess = (user?: { id: number; role?: string }) => {
    void registerPushNotifications(apolloClient);
    const role = user?.role != null ? String(user.role).toUpperCase() : undefined;
    if (role === 'STUDENT') {
      getMyStudentProfile();
    } else if (role === 'TUTOR' || user === undefined) {
      void routeLoggedInTutor();
    } else {
      setCurrentView('home');
    }
  };

  const handleForgotPassword = () => setCurrentView('forgotPassword');

  const handleAlreadyRegistered = useCallback(() => {
    setLoginNotice(ALREADY_REGISTERED_LOGIN_MESSAGE);
    setCurrentView('login');
  }, []);

  const handleLoginNoticeConsumed = useCallback(() => {
    setLoginNotice(null);
  }, []);

  const handleSignUp = (
    userId?: number,
    verificationStatus?: {
      isMobileVerified: boolean;
      isEmailVerified: boolean;
      mobileVerificationRequired?: boolean;
    }
  ) => {
    setSignupResume(userId ? { userId, verificationStatus } : null);
    setCurrentView('signup');
  };

  const handleSignupComplete = useCallback(
    async (email: string, password: string) => {
      try {
        const { data } = await loginMutation({
          variables: { input: { loginId: email, password } },
        });
        const accessToken = data?.login?.accessToken;
        if (accessToken) {
          await setAuthToken(accessToken);
        }
        handleLoginSuccess(data?.login?.user);
      } catch {
        setCurrentView('login');
      }
    },
    [loginMutation],
  );

  const handleBackToLogin = () => {
    setCurrentView('login');
    setSignupResume(null);
  };

  const handleTutorOnboardingComplete = () => {
    setTutorProfileForOnboarding(null);
    void routeLoggedInTutor();
  };

  const handleStudentOnboardingComplete = () => {
    setStudentProfileForOnboarding(null);
    setCurrentView('studentHome');
  };

  const handleOpenWallet = useCallback((from: WalletReturnView) => {
    if (currentViewRef.current === 'tutorBankSetup' || currentViewRef.current === 'tutorRateCardSetup') {
      return;
    }
    setWalletReturnView(from);
    setCurrentView('wallet');
  }, []);

  const handleWalletBack = useCallback(() => {
    setCurrentView(walletReturnView);
  }, [walletReturnView]);

  const openWalletFromPush = useCallback(() => {
    if (currentViewRef.current === 'tutorBankSetup' || currentViewRef.current === 'tutorRateCardSetup') {
      return;
    }
    const nextReturn = walletReturnFromPush(currentViewRef.current);
    if (nextReturn) {
      setWalletReturnView(nextReturn);
    }
    setCurrentView('wallet');
    setPushBanner(null);
  }, []);

  const handlePushOpen = useCallback(
    (payload: PushPayload) => {
      if (!isAuthedView(currentViewRef.current)) {
        return;
      }
      if (shouldOpenWallet(payload)) {
        openWalletFromPush();
      }
    },
    [openWalletFromPush],
  );

  const showPushBanner = useCallback((payload: PushPayload) => {
    setPushBanner(payload);
    if (pushBannerTimerRef.current) {
      clearTimeout(pushBannerTimerRef.current);
    }
    pushBannerTimerRef.current = setTimeout(() => {
      setPushBanner(null);
      pushBannerTimerRef.current = null;
    }, 6000);
  }, []);

  const authed = isAuthedView(currentView);
  const consumedInitialPush = useRef(false);

  useEffect(() => {
    if (!authed) {
      consumedInitialPush.current = false;
      return;
    }
    let unsubscribeForeground: () => void = () => undefined;
    let unsubscribeOpened: () => void = () => undefined;
    try {
      unsubscribeForeground = subscribeForegroundPush(showPushBanner);
      unsubscribeOpened = subscribeNotificationOpened(handlePushOpen);
      if (!consumedInitialPush.current) {
        consumedInitialPush.current = true;
        void consumeInitialNotification(handlePushOpen);
      }
    } catch (error) {
      console.warn('[push] Failed to subscribe after login', error);
    }
    return () => {
      unsubscribeForeground();
      unsubscribeOpened();
    };
  }, [authed, handlePushOpen, showPushBanner]);

  let screen: React.ReactNode;
  if (currentView === 'splash') {
    screen = <SplashScreen onFinish={handleSplashFinish} />;
  } else if (currentView === 'signup') {
    screen = (
      <SignUpScreen
        resumeUserId={signupResume?.userId}
        resumeVerificationStatus={signupResume?.verificationStatus}
        onVerificationComplete={handleSignupComplete}
        onFallbackToLogin={() => setCurrentView('login')}
        onAlreadyRegistered={handleAlreadyRegistered}
      />
    );
  } else if (currentView === 'forgotPassword') {
    screen = <ForgotPasswordScreen onBackToLogin={handleBackToLogin} />;
  } else if (currentView === 'tutorOnboarding') {
    screen = (
      <TutorOnboarding
        initialProfile={tutorProfileForOnboarding}
        onComplete={handleTutorOnboardingComplete}
        onLogout={handleLogout}
      />
    );
  } else if (currentView === 'studentOnboarding') {
    screen = (
      <StudentOnboarding
        initialProfile={studentProfileForOnboarding}
        onComplete={handleStudentOnboardingComplete}
        onLogout={handleLogout}
      />
    );
  } else if (currentView === 'studentHome') {
    screen = (
      <View style={{ flex: 1, backgroundColor: '#e8f4ff' }}>
        <StudentHomeHeader
          onProfilePress={() => setCurrentView('studentProfile')}
          onOpenWallet={() => handleOpenWallet('studentHome')}
        />
        <StudentHomeScreen
          onOpenTutorSearch={() => setCurrentView('studentTutorSearch')}
        />
        <StudentTabBar
          active="home"
          onHome={() => undefined}
          onSearch={() => setCurrentView('studentTutorSearch')}
          onProfile={() => setCurrentView('studentProfile')}
        />
      </View>
    );
  } else if (
    currentView === 'studentTutorSearch' ||
    currentView === 'studentTutorSearchResults'
  ) {
    const showResults =
      currentView === 'studentTutorSearchResults' && tutorSearchParams != null;
    screen = (
      <View style={{ flex: 1 }}>
        <StudentNavHeader
          title={showResults ? 'Tutors' : 'Search'}
          onBack={showResults ? () => setCurrentView('studentTutorSearch') : undefined}
          onLogout={handleLogout}
          onProfilePress={() => setCurrentView('studentProfile')}
          onOpenWallet={() => handleOpenWallet('studentHome')}
        />
        {showResults && tutorSearchParams ? (
          <StudentTutorSearchResultsScreen
            searchParams={tutorSearchParams}
            onRefineSearch={setTutorSearchParams}
            onOpenTutorPreview={(tutorId, offeringId) => {
              setTutorPreview({ tutorId, offeringId });
              setCurrentView('studentTutorPreview');
            }}
          />
        ) : (
          <StudentTutorSearchScreen
            onSearch={(params) => {
              setTutorSearchParams(params);
              setCurrentView('studentTutorSearchResults');
            }}
          />
        )}
        <StudentTabBar
          active="search"
          onHome={() => setCurrentView('studentHome')}
          onSearch={
            showResults ? () => setCurrentView('studentTutorSearch') : () => undefined
          }
          onProfile={() => setCurrentView('studentProfile')}
        />
      </View>
    );
  } else if (currentView === 'studentTutorPreview' && tutorPreview) {
    screen = (
      <View style={{ flex: 1 }}>
        <StudentNavHeader
          title="Tutor"
          onBack={() =>
            setCurrentView(
              tutorSearchParams ? 'studentTutorSearchResults' : 'studentTutorSearch',
            )
          }
          onLogout={handleLogout}
          onProfilePress={() => setCurrentView('studentProfile')}
          onOpenWallet={() => handleOpenWallet('studentHome')}
        />
        <StudentTutorPreviewScreen
          tutorId={tutorPreview.tutorId}
          offeringId={tutorPreview.offeringId}
          onBookClass={() => {
            setBookingDraft({
              tutorId: tutorPreview.tutorId,
              offeringId: tutorPreview.offeringId,
            });
            setCurrentView('studentTutorBooking');
          }}
        />
      </View>
    );
  } else if (currentView === 'studentTutorBooking' && tutorPreview) {
    screen = (
      <View style={{ flex: 1 }}>
        <StudentNavHeader
          title="Book class"
          onBack={() => setCurrentView('studentTutorPreview')}
          onLogout={handleLogout}
          onProfilePress={() => setCurrentView('studentProfile')}
          onOpenWallet={() => handleOpenWallet('studentHome')}
        />
        <StudentTutorBookingScreen
          tutorId={tutorPreview.tutorId}
          offeringId={tutorPreview.offeringId}
          draft={bookingDraft}
          onContinue={(draft) => {
            setBookingDraft(draft);
            setCurrentView('studentTutorBookingConfirm');
          }}
        />
      </View>
    );
  } else if (
    currentView === 'studentTutorBookingConfirm' &&
    isStudentBookingDraftReady(bookingDraft)
  ) {
    screen = (
      <View style={{ flex: 1 }}>
        <StudentNavHeader
          title="Confirm class"
          onBack={() => setCurrentView('studentTutorBooking')}
          onLogout={handleLogout}
          onProfilePress={() => setCurrentView('studentProfile')}
          onOpenWallet={() => handleOpenWallet('studentTutorBookingConfirm')}
        />
        <StudentTutorBookingConfirmScreen
          draft={bookingDraft}
          onBooked={() => {
            setBookingDraft(null);
            setCurrentView('studentHome');
          }}
          onOpenWallet={() => handleOpenWallet('studentTutorBookingConfirm')}
        />
      </View>
    );
  } else if (currentView === 'studentProfile') {
    screen = (
      <View style={{ flex: 1 }}>
        <StudentNavHeader
          title="My profile"
          onLogout={handleLogout}
          onProfilePress={() => setCurrentView('studentProfile')}
          onOpenWallet={() => handleOpenWallet('studentProfile')}
        />
        <StudentDetailScreen
          onAccountDeleted={() => {
            void handleAccountDeleted();
          }}
        />
        <StudentTabBar
          active="profile"
          onHome={() => setCurrentView('studentHome')}
          onSearch={() => setCurrentView('studentTutorSearch')}
          onProfile={() => undefined}
        />
      </View>
    );
  } else if (currentView === 'tutorBankSetup') {
    screen = (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <NavHeader title="Account setup" onLogout={handleLogout} />
        <TutorBankSetupScreen onComplete={() => void routeLoggedInTutor()} />
      </View>
    );
  } else if (currentView === 'tutorRateCardSetup') {
    screen = (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <NavHeader
          title="Rate card"
          onLogout={handleLogout}
          onBack={
            rateCardCanDefer
              ? () => confirmRateCardLater(() => setCurrentView('tutorProfile'))
              : undefined
          }
        />
        <TutorRateCardSetupScreen
          onComplete={() => setCurrentView('tutorHome')}
          onLater={() => setCurrentView('tutorProfile')}
          onDeferChange={setRateCardCanDefer}
        />
      </View>
    );
  } else if (currentView === 'tutorHome') {
    screen = (
      <View style={{ flex: 1 }}>
        <TutorNavHeader
          title="Home"
          onLogout={handleLogout}
          onProfilePress={() => setCurrentView('tutorProfile')}
          onOpenWallet={() => handleOpenWallet('tutorHome')}
        />
        <TutorHomeScreen
          onSetRateCard={() => setCurrentView('tutorRateCardSetup')}
          onUpdateCalendar={() => openTutorCalendar('tutorHome')}
        />
      </View>
    );
  } else if (currentView === 'tutorCalendar') {
    screen = (
      <View style={{ flex: 1 }}>
        <TutorNavHeader
          title="Calendar"
          onBack={() => setCurrentView(tutorCalendarReturnView)}
          onLogout={handleLogout}
          onOpenWallet={() => handleOpenWallet('tutorHome')}
        />
        <TutorCalendarScreen
          onSetupComplete={() => {
            void routeLoggedInTutor();
          }}
        />
      </View>
    );
  } else if (currentView === 'tutorProfile') {
    screen = (
      <View style={{ flex: 1 }}>
        <TutorNavHeader
          title="My profile"
          onBack={() => setCurrentView('tutorHome')}
          onLogout={handleLogout}
          onOpenWallet={() => handleOpenWallet('tutorProfile')}
        />
        <TutorDetailScreen
          onOpenCalendar={() => openTutorCalendar('tutorProfile')}
          onAccountDeleted={() => {
            void handleAccountDeleted();
          }}
        />
      </View>
    );
  } else if (currentView === 'wallet') {
    const studentWallet =
      walletReturnView === 'studentHome' ||
      walletReturnView === 'studentProfile' ||
      walletReturnView === 'studentTutorBookingConfirm';
    const tutorWallet =
      walletReturnView === 'tutorHome' || walletReturnView === 'tutorProfile';
    screen = (
      <View style={{ flex: 1 }}>
        {studentWallet ? (
          <StudentNavHeader
            title="Wallet"
            onBack={handleWalletBack}
            onLogout={handleLogout}
            onProfilePress={() => setCurrentView('studentProfile')}
            onOpenWallet={() => undefined}
          />
        ) : tutorWallet ? (
          <TutorNavHeader
            title="Wallet"
            onBack={handleWalletBack}
            onLogout={handleLogout}
            onOpenWallet={() => undefined}
          />
        ) : (
          <NavHeader
            title="Wallet"
            onBack={handleWalletBack}
            onLogout={handleLogout}
          />
        )}
        <WalletScreen onBack={handleWalletBack} />
      </View>
    );
  } else if (currentView === 'home') {
    screen = <HomeScreen onLogout={handleLogout} />;
  } else {
    screen = (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        onForgotPassword={handleForgotPassword}
        onSignUp={handleSignUp}
        noticeMessage={loginNotice}
        onNoticeConsumed={handleLoginNoticeConsumed}
      />
    );
  }

  return (
    <>
      <AnalyticsViewTracker screenName={currentView} />
      {screen}
      {pushBanner ? (
        <Pressable
          style={pushBannerStyles.banner}
          onPress={() => handlePushOpen(pushBanner)}
        >
          <Image
            source={notificationIcon}
            style={pushBannerStyles.icon}
            accessibilityLabel={BRAND_NAME}
          />
          <View style={pushBannerStyles.text}>
            <Text style={pushBannerStyles.title}>{BRAND_NAME}</Text>
            {pushBanner.body || pushBanner.title ? (
              <Text style={pushBannerStyles.body} numberOfLines={2}>
                {pushBanner.body || pushBanner.title}
              </Text>
            ) : null}
          </View>
        </Pressable>
      ) : null}
    </>
  );
}

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
    <ErrorBoundary>
      <ApolloProvider
        client={
          // Dual @apollo/client installs (root vs apps/mobile) make these types nominally incompatible.
          client as unknown as React.ComponentProps<typeof ApolloProvider>['client']
        }
      >
        <FeatureFlagsProvider>
          <AppUpdateGate>
            <AppContent />
          </AppUpdateGate>
        </FeatureFlagsProvider>
      </ApolloProvider>
    </ErrorBoundary>
  );
};

export default App;

const pushBannerStyles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    borderRadius: 12,
    backgroundColor: '#143055',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    marginRight: 12,
  },
  text: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  body: {
    color: '#e5e7eb',
    fontSize: 13,
    marginTop: 4,
  },
});
