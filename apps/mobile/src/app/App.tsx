import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  BackHandler,
  Platform,
  StatusBar,
} from 'react-native';
import { androidBottomInset, androidTopInset } from './components/SafeAreaView';
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
import { OnlineClassScreen } from './components/online-class/OnlineClassScreen';
import { StudentBookingHistoryScreen } from './components/student-home/StudentBookingHistoryScreen';
import {
  StudentBookingScheduledClassesScreen,
  type BookingScheduledClassesContext,
} from './components/student-home/StudentBookingScheduledClassesScreen';
import {
  ClassCancellationBooking,
  StudentClassCancellationScreen,
} from './components/student-home/StudentClassCancellationScreen';
import { StudentConcludedClassesScreen } from './components/student-home/StudentConcludedClassesScreen';
import { StudentPostClassRefundClaimScreen } from './components/student-home/StudentPostClassRefundClaimScreen';
import { StudentTutorSearchScreen } from './components/student-tutor-search/StudentTutorSearchScreen';
import { StudentTutorSearchResultsScreen } from './components/student-tutor-search/StudentTutorSearchResultsScreen';
import type { StudentTutorSearchParams } from './components/student-tutor-search/student-tutor-search-params';
import { StudentTutorPreviewScreen } from './components/student-tutor-preview/StudentTutorPreviewScreen';
import { StudentRebookTutorsScreen } from './components/student-rebook/StudentRebookTutorsScreen';
import { StudentCartScreen } from './components/student-cart/StudentCartScreen';
import { StudentCartCheckoutScreen } from './components/student-cart/StudentCartCheckoutScreen';
import {
  StudentClassCreditsScreen,
  type StudentClassCredit,
} from './components/student-cart/StudentClassCreditsScreen';
import { StudentClassScheduleScreen } from './components/student-cart/StudentClassScheduleScreen';
import {
  StudentHomeHeader,
  StudentNavHeader,
  StudentTabBar,
  type StudentTab,
} from './components/student-nav';
import { TutorDetailScreen } from './components/tutor-profile/TutorDetailScreen';
import { TutorHomeScreen } from './components/tutor-home/TutorHomeScreen';
import { TutorConcludedClassesScreen } from './components/tutor-home/TutorConcludedClassesScreen';
import { TutorPostClassRefundClaimScreen } from './components/tutor-home/TutorPostClassRefundClaimScreen';
import { TutorBookingHistoryScreen } from './components/tutor-home/TutorBookingHistoryScreen';
import { TutorBankSetupScreen } from './components/tutor-bank-setup/TutorBankSetupScreen';
import {
  TutorRateCardSetupScreen,
  confirmRateCardLater,
} from './components/tutor-rate-card-setup/TutorRateCardSetupScreen';
import { TutorCalendarScreen } from './components/tutor-calendar/TutorCalendarScreen';
import { TutorNavHeader, TutorTabBar, type TutorTab } from './components/tutor-nav';
import { WalletScreen } from './components/wallet';
import { NavHeader } from './components/NavHeader';
import {
  isStudentCartReturnView,
  studentViewAfterProfile,
  tutorViewAfterProfile,
  walletReturnFromPush,
  type AppView,
  type StudentCartOverlay,
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
import { ALREADY_REGISTERED_LOGIN_MESSAGE } from '@tutorix/shared-utils/already-registered';
import {
  GET_MY_STUDENT_PROFILE,
  GET_MY_TUTOR_DETAIL,
  GET_MY_TUTOR_PROFILE,
  MY_CLASS_CREDITS,
  STUDENT_CLASS_BOOKINGS,
} from '@tutorix/shared-graphql/queries';
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

/** Tab bar already pads the system navigation bar on these screens. */
const STUDENT_VIEWS_WITH_TAB_BAR: AppView[] = [
  'studentHome',
  'studentTutorSearch',
  'studentTutorSearchResults',
  'studentRebookTutors',
  'studentTutorPreview',
  'studentBookingHistory',
  'studentConcludedClasses',
  'studentClassCredits',
  'studentClassSchedule',
  'studentProfile',
];

const TUTOR_VIEWS_WITH_TAB_BAR: AppView[] = [
  'tutorHome',
  'tutorCalendar',
  'tutorProfile',
  'tutorBookingHistory',
  'tutorConcludedClasses',
];

function isStudentWalletTabContext(returnView: WalletReturnView): boolean {
  return (
    returnView === 'studentCartCheckout' || isStudentCartReturnView(returnView)
  );
}

function isTutorWalletTabContext(returnView: WalletReturnView): boolean {
  return returnView === 'tutorHome' || returnView === 'tutorProfile';
}

function viewShowsStudentTabBar(
  view: AppView,
  walletReturnView: WalletReturnView,
): boolean {
  if (STUDENT_VIEWS_WITH_TAB_BAR.includes(view)) {
    return true;
  }
  return view === 'wallet' && isStudentWalletTabContext(walletReturnView);
}

function viewShowsTutorTabBar(
  view: AppView,
  walletReturnView: WalletReturnView,
  tutorCalendarWithoutTabBar: boolean,
): boolean {
  if (view === 'tutorCalendar' && tutorCalendarWithoutTabBar) {
    return false;
  }
  if (TUTOR_VIEWS_WITH_TAB_BAR.includes(view)) {
    return true;
  }
  return view === 'wallet' && isTutorWalletTabContext(walletReturnView);
}

function screenHostBottomInset(
  view: AppView,
  walletReturnView: WalletReturnView,
  tutorCalendarWithoutTabBar: boolean,
): number {
  if (
    viewShowsStudentTabBar(view, walletReturnView) ||
    viewShowsTutorTabBar(view, walletReturnView, tutorCalendarWithoutTabBar)
  ) {
    return 0;
  }
  if (view === 'splash' || view === 'onlineClass') {
    return 0;
  }
  return androidBottomInset();
}

function isAuthedView(view: AppView): boolean {
  return !UNAUTHED_VIEWS.includes(view);
}

function AppContent() {
  const apolloClient = useApolloClient();
  const [currentView, setCurrentView] = useState<AppView>('splash');
  const [onlineClassSession, setOnlineClassSession] = useState<{
    sessionId: string;
    returnView: 'studentHome' | 'tutorHome';
    displayName: string;
    canEndClass: boolean;
  } | null>(null);
  const [walletReturnView, setWalletReturnView] =
    useState<WalletReturnView>('tutorHome');
  const [walletReturnCartOverlay, setWalletReturnCartOverlay] =
    useState<StudentCartOverlay | null>(null);
  const [studentCartOverlay, setStudentCartOverlay] =
    useState<StudentCartOverlay | null>(null);
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
    returnView: AppView;
  } | null>(null);
  const [rebookReturnView, setRebookReturnView] = useState<AppView>('studentHome');
  const [scheduleCredits, setScheduleCredits] = useState<StudentClassCredit[] | null>(null);
  const [scheduleReturnView, setScheduleReturnView] = useState<AppView>('studentClassCredits');
  const [postClassRefundEnrollmentId, setPostClassRefundEnrollmentId] = useState<string | null>(
    null,
  );
  const [tutorPostClassRefundClaimId, setTutorPostClassRefundClaimId] = useState<number | null>(
    null,
  );
  const [classCancellationBooking, setClassCancellationBooking] =
    useState<ClassCancellationBooking | null>(null);
  const [bookingScheduledContext, setBookingScheduledContext] =
    useState<BookingScheduledClassesContext | null>(null);
  const [cancellationReturnView, setCancellationReturnView] =
    useState<AppView>('studentBookingHistory');
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
  const [forceWeeklyAvailability, setForceWeeklyAvailability] = useState(false);
  const forceWeeklyAvailabilityRef = useRef(false);
  forceWeeklyAvailabilityRef.current = forceWeeklyAvailability;
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
    setForceWeeklyAvailability(false);
    setTutorProfileForOnboarding(null);
    setStudentProfileForOnboarding(null);
    setTutorPreview(null);
    setTutorSearchParams(null);
    setSignupResume(null);
    setPushBanner(null);
    setStudentCartOverlay(null);
    setWalletReturnCartOverlay(null);
    if (pushBannerTimerRef.current) {
      clearTimeout(pushBannerTimerRef.current);
      pushBannerTimerRef.current = null;
    }
  }, [apolloClient]);

  const startScheduleForBooking = useCallback(
    async (orderItemId: number) => {
      try {
        const { data } = await apolloClient.query({
          query: MY_CLASS_CREDITS,
          fetchPolicy: 'network-only',
        });
        const credits = (data?.myClassCredits ?? []) as StudentClassCredit[];
        const pack = credits.filter(
          (row) => row.orderItemId === orderItemId && row.status === 'unscheduled',
        );
        if (pack.length === 0) {
          return;
        }
        setScheduleCredits(pack);
        setScheduleReturnView('studentBookingHistory');
        setCurrentView('studentClassSchedule');
      } catch {
        // Booking history stays visible if credits cannot be loaded.
      }
    },
    [apolloClient],
  );

  const openCancellationForCredit = useCallback(
    async (credit: StudentClassCredit) => {
      try {
        const { data } = await apolloClient.query({
          query: STUDENT_CLASS_BOOKINGS,
          variables: { input: { page: 1, pageSize: 100 } },
          fetchPolicy: 'network-only',
        });
        const row = data?.studentClassBookings?.items?.find(
          (item: { orderItemId: number }) => item.orderItemId === credit.orderItemId,
        );
        if (!row?.canCancel) {
          return;
        }
        setClassCancellationBooking({
          orderItemId: row.orderItemId,
          tutorName: row.tutorName,
          offeringLabel: row.offeringLabel,
          classCount: row.classCount,
          scheduledCount: row.scheduledCount,
          unscheduledCount: row.unscheduledCount,
          concludedCount: row.concludedCount,
          cancelledCount: row.cancelledCount,
          cancellableCount: row.cancellableCount,
        });
        setCancellationReturnView('studentHome');
        setCurrentView('studentClassCancellation');
      } catch {
        // Stay on home if booking details cannot be loaded.
      }
    },
    [apolloClient],
  );

  const openTutorCalendar = useCallback((returnTo: AppView) => {
    setForceWeeklyAvailability(false);
    setTutorCalendarReturnView(returnTo);
    setCurrentView('tutorCalendar');
  }, []);

  const handleAccountDeleted = useCallback(async () => {
    await clearBiometricToken();
    await removeAuthToken();
    await apolloClient.clearStore();
    setCurrentView('login');
    setForceWeeklyAvailability(false);
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
      const nextView = tutorViewAfterProfile({
        onBoardingComplete: tutor.onBoardingComplete,
        onboardingCelebrationSeen: tutor.onboardingCelebrationSeen,
        bankDetailsComplete,
        needsRateCardSetup: rateCardSetupNeeded,
        needsWeeklyAvailabilitySetup,
      });
      setForceWeeklyAvailability(
        nextView === 'tutorCalendar' && needsWeeklyAvailabilitySetup,
      );
      setCurrentView(nextView);
    } catch {
      setForceWeeklyAvailability(false);
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

  const openStudentCart = useCallback(() => {
    setStudentCartOverlay('cart');
  }, []);

  const closeStudentCartOverlay = useCallback(() => {
    setStudentCartOverlay(null);
  }, []);

  useEffect(() => {
    if (!studentCartOverlay) {
      return undefined;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (studentCartOverlay === 'checkout') {
        setStudentCartOverlay('cart');
      } else {
        setStudentCartOverlay(null);
      }
      return true;
    });
    return () => subscription.remove();
  }, [studentCartOverlay]);

  const handleOpenWallet = useCallback(
    (from: WalletReturnView) => {
      if (
        currentViewRef.current === 'tutorBankSetup' ||
        currentViewRef.current === 'tutorRateCardSetup' ||
        forceWeeklyAvailabilityRef.current
      ) {
        return;
      }
      const underlying = currentViewRef.current;
      const returnView = isStudentCartReturnView(underlying) ? underlying : from;
      setWalletReturnCartOverlay(studentCartOverlay);
      setStudentCartOverlay(null);
      setWalletReturnView(returnView);
      setCurrentView('wallet');
    },
    [studentCartOverlay],
  );

  const handleWalletBack = useCallback(() => {
    setCurrentView(walletReturnView);
    if (walletReturnCartOverlay) {
      setStudentCartOverlay(walletReturnCartOverlay);
      setWalletReturnCartOverlay(null);
    } else if (walletReturnView === 'studentCartCheckout') {
      setStudentCartOverlay('checkout');
    }
  }, [walletReturnView, walletReturnCartOverlay]);

  const openWalletFromPush = useCallback(() => {
    if (
      currentViewRef.current === 'tutorBankSetup' ||
      currentViewRef.current === 'tutorRateCardSetup' ||
      forceWeeklyAvailabilityRef.current
    ) {
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

  const goStudentHome = useCallback(() => setCurrentView('studentHome'), []);
  const goStudentSearch = useCallback(
    () => setCurrentView('studentTutorSearch'),
    [],
  );
  const goStudentWallet = useCallback(
    () => handleOpenWallet('studentHome'),
    [handleOpenWallet],
  );
  const goStudentProfile = useCallback(
    () => setCurrentView('studentProfile'),
    [],
  );

  const renderStudentTabBar = (active: StudentTab | null) => (
    <StudentTabBar
      active={active}
      onHome={goStudentHome}
      onSearch={goStudentSearch}
      onWallet={goStudentWallet}
      onProfile={goStudentProfile}
    />
  );

  const renderStudentShell = (
    active: StudentTab | null,
    header: React.ReactNode,
    children: React.ReactNode,
    shellStyle?: object,
  ) => (
    <View style={[{ flex: 1 }, shellStyle]}>
      {header}
      {children}
      {renderStudentTabBar(active)}
    </View>
  );

  const goTutorHome = useCallback(() => setCurrentView('tutorHome'), []);
  const goTutorCalendarFromTab = useCallback(() => {
    setTutorCalendarReturnView('tutorHome');
    setCurrentView('tutorCalendar');
  }, []);
  const goTutorWallet = useCallback(
    () => handleOpenWallet('tutorHome'),
    [handleOpenWallet],
  );
  const goTutorProfile = useCallback(() => setCurrentView('tutorProfile'), []);

  const renderTutorTabBar = (active: TutorTab | null) => (
    <TutorTabBar
      active={active}
      onHome={goTutorHome}
      onCalendar={goTutorCalendarFromTab}
      onWallet={goTutorWallet}
      onProfile={goTutorProfile}
    />
  );

  const renderTutorShell = (
    active: TutorTab | null,
    header: React.ReactNode,
    children: React.ReactNode,
    shellStyle?: object,
  ) => (
    <View style={[{ flex: 1 }, shellStyle]}>
      {header}
      {children}
      {renderTutorTabBar(active)}
    </View>
  );

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
  } else if (currentView === 'onlineClass' && onlineClassSession) {
    screen = (
      <OnlineClassScreen
        sessionId={onlineClassSession.sessionId}
        displayName={onlineClassSession.displayName}
        canEndClass={onlineClassSession.canEndClass}
        onLeave={() => setCurrentView(onlineClassSession.returnView)}
      />
    );
  } else if (currentView === 'studentHome') {
    screen = renderStudentShell(
      'home',
      <StudentHomeHeader onOpenCart={openStudentCart} onLogout={handleLogout} />,
      <StudentHomeScreen
        onOpenTutorSearch={() => setCurrentView('studentTutorSearch')}
        onOpenRebook={() => {
          setRebookReturnView('studentHome');
          setCurrentView('studentRebookTutors');
        }}
        onScheduleCredits={() => setCurrentView('studentClassCredits')}
        onRescheduleCredit={(credit) => {
          setScheduleReturnView('studentHome');
          setScheduleCredits([credit]);
          setCurrentView('studentClassSchedule');
        }}
        onCancelScheduledClass={(credit) => void openCancellationForCredit(credit)}
        onOpenConcludedClasses={() => setCurrentView('studentConcludedClasses')}
        onOpenBookingHistory={() => setCurrentView('studentBookingHistory')}
        onJoinOnlineClass={(sessionId) => {
          setOnlineClassSession({
            sessionId,
            returnView: 'studentHome',
            displayName: 'Student',
            canEndClass: false,
          });
          setCurrentView('onlineClass');
        }}
      />,
      { backgroundColor: '#e8f4ff' },
    );
  } else if (
    currentView === 'studentTutorSearch' ||
    currentView === 'studentTutorSearchResults'
  ) {
    const showResults =
      currentView === 'studentTutorSearchResults' && tutorSearchParams != null;
    screen = renderStudentShell(
      showResults ? null : 'search',
      <StudentNavHeader
        title={showResults ? 'Tutors' : 'Search'}
        onBack={showResults ? () => setCurrentView('studentTutorSearch') : undefined}
        onLogout={handleLogout}
        onOpenCart={openStudentCart}
      />,
      showResults && tutorSearchParams ? (
        <StudentTutorSearchResultsScreen
          searchParams={tutorSearchParams}
          onRefineSearch={setTutorSearchParams}
          onOpenTutorPreview={(tutorId, offeringId) => {
            setTutorPreview({
              tutorId,
              offeringId,
              returnView: 'studentTutorSearchResults',
            });
            setCurrentView('studentTutorPreview');
          }}
        />
      ) : (
        <StudentTutorSearchScreen
          onSearch={(params) => {
            setTutorSearchParams(params);
            setCurrentView('studentTutorSearchResults');
          }}
          onRebook={() => {
            setRebookReturnView('studentTutorSearch');
            setCurrentView('studentRebookTutors');
          }}
        />
      ),
    );
  } else if (currentView === 'studentRebookTutors') {
    screen = renderStudentShell(
      null,
      <StudentNavHeader
        title="Re-book"
        onBack={() => setCurrentView(rebookReturnView)}
        onLogout={handleLogout}
        onOpenCart={openStudentCart}
      />,
      <StudentRebookTutorsScreen
        onFindTutor={() => setCurrentView('studentTutorSearch')}
        onOpenTutorPreview={(tutorId, offeringId) => {
          setTutorPreview({
            tutorId,
            offeringId,
            returnView: 'studentRebookTutors',
          });
          setCurrentView('studentTutorPreview');
        }}
      />,
      { backgroundColor: '#e8f4ff' },
    );
  } else if (currentView === 'studentTutorPreview' && tutorPreview) {
    screen = renderStudentShell(
      null,
      <StudentNavHeader
        title="Tutor"
        onBack={() => setCurrentView(tutorPreview.returnView)}
        onLogout={handleLogout}
        onOpenCart={openStudentCart}
      />,
      <StudentTutorPreviewScreen
        tutorId={tutorPreview.tutorId}
        offeringId={tutorPreview.offeringId}
        onViewCart={openStudentCart}
      />,
    );
  } else if (currentView === 'studentBookingHistory') {
    screen = renderStudentShell(
      null,
      <StudentNavHeader
        title="Booking history"
        onBack={() => setCurrentView('studentHome')}
        onLogout={handleLogout}
        onOpenCart={openStudentCart}
      />,
      <StudentBookingHistoryScreen
        onCancelBooking={(booking) => {
          setCancellationReturnView('studentBookingHistory');
          setClassCancellationBooking(booking);
          setCurrentView('studentClassCancellation');
        }}
        onScheduleBooking={(orderItemId) => void startScheduleForBooking(orderItemId)}
        onViewScheduledClasses={(booking) => {
          setBookingScheduledContext(booking);
          setCurrentView('studentBookingScheduledClasses');
        }}
      />,
      { backgroundColor: '#e8f4ff' },
    );
  } else if (currentView === 'studentBookingScheduledClasses' && bookingScheduledContext) {
    screen = renderStudentShell(
      null,
      <StudentNavHeader
        title="Scheduled classes"
        onBack={() => {
          setBookingScheduledContext(null);
          setCurrentView('studentBookingHistory');
        }}
        onLogout={handleLogout}
        onOpenCart={openStudentCart}
      />,
      <StudentBookingScheduledClassesScreen
        booking={bookingScheduledContext}
        onReschedule={(credit) => {
          setScheduleReturnView('studentBookingScheduledClasses');
          setScheduleCredits([credit]);
          setCurrentView('studentClassSchedule');
        }}
      />,
      { backgroundColor: '#e8f4ff' },
    );
  } else if (currentView === 'studentClassCancellation' && classCancellationBooking) {
    const leaveClassCancellation = () => {
      setClassCancellationBooking(null);
      setCurrentView(cancellationReturnView);
    };
    screen = renderStudentShell(
      null,
      <StudentNavHeader
        title="Class cancellation"
        onBack={leaveClassCancellation}
        onLogout={handleLogout}
        onOpenCart={openStudentCart}
      />,
      <StudentClassCancellationScreen
        booking={classCancellationBooking}
        onComplete={leaveClassCancellation}
        onBack={leaveClassCancellation}
      />,
      { backgroundColor: '#e8f4ff' },
    );
  } else if (currentView === 'studentConcludedClasses') {
    screen = renderStudentShell(
      null,
      <StudentNavHeader
        title="Concluded classes"
        onBack={() => setCurrentView('studentHome')}
        onLogout={handleLogout}
        onOpenCart={openStudentCart}
      />,
      <StudentConcludedClassesScreen
        onClaimRefund={(enrollmentId) => {
          setPostClassRefundEnrollmentId(enrollmentId);
          setCurrentView('studentPostClassRefundClaim');
        }}
      />,
      { backgroundColor: '#e8f4ff' },
    );
  } else if (currentView === 'studentPostClassRefundClaim' && postClassRefundEnrollmentId) {
    screen = renderStudentShell(
      null,
      <StudentNavHeader
        title="Claim refund"
        onBack={() => {
          setPostClassRefundEnrollmentId(null);
          setCurrentView('studentConcludedClasses');
        }}
        onLogout={handleLogout}
        onOpenCart={openStudentCart}
      />,
      <StudentPostClassRefundClaimScreen
        enrollmentId={postClassRefundEnrollmentId}
        onComplete={() => {
          setPostClassRefundEnrollmentId(null);
          setCurrentView('studentConcludedClasses');
        }}
        onBack={() => {
          setPostClassRefundEnrollmentId(null);
          setCurrentView('studentConcludedClasses');
        }}
      />,
      { backgroundColor: '#e8f4ff' },
    );
  } else if (currentView === 'studentClassCredits') {
    screen = renderStudentShell(
      null,
      <StudentNavHeader
        title="Schedule"
        onBack={() => setCurrentView('studentHome')}
        onLogout={handleLogout}
        onOpenCart={openStudentCart}
      />,
      <StudentClassCreditsScreen
        onSchedule={(credits) => {
          setScheduleReturnView('studentClassCredits');
          setScheduleCredits(credits);
          setCurrentView('studentClassSchedule');
        }}
        onScheduleLater={() => setCurrentView('studentHome')}
      />,
    );
  } else if (currentView === 'studentClassSchedule' && scheduleCredits?.length) {
    const leaveSchedule = () => {
      setScheduleCredits(null);
      if (scheduleReturnView === 'studentBookingHistory') {
        setCurrentView('studentBookingHistory');
      } else if (scheduleReturnView === 'studentBookingScheduledClasses') {
        setCurrentView('studentBookingScheduledClasses');
      } else if (scheduleReturnView === 'studentHome') {
        setCurrentView('studentHome');
      } else {
        setCurrentView('studentClassCredits');
      }
      setScheduleReturnView('studentClassCredits');
    };
    const finishSchedule = () => {
      setScheduleCredits(null);
      if (scheduleReturnView === 'studentBookingHistory') {
        setCurrentView('studentBookingHistory');
      } else if (scheduleReturnView === 'studentBookingScheduledClasses') {
        setCurrentView('studentBookingScheduledClasses');
      } else if (scheduleReturnView === 'studentHome') {
        setCurrentView('studentHome');
      } else {
        setCurrentView('studentHome');
      }
      setScheduleReturnView('studentClassCredits');
    };
    screen = renderStudentShell(
      null,
      <StudentNavHeader
        title="Schedule class"
        onBack={leaveSchedule}
        onLogout={handleLogout}
      />,
      <StudentClassScheduleScreen
        credits={scheduleCredits}
        onScheduled={finishSchedule}
        onScheduleLater={finishSchedule}
      />,
    );
  } else if (currentView === 'studentProfile') {
    screen = renderStudentShell(
      'profile',
      <StudentNavHeader
        title="My profile"
        onLogout={handleLogout}
        onOpenCart={openStudentCart}
      />,
      <StudentDetailScreen
        onAccountDeleted={() => {
          void handleAccountDeleted();
        }}
      />,
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
              ? () => confirmRateCardLater(() => {
                  void routeLoggedInTutor();
                })
              : undefined
          }
        />
        <TutorRateCardSetupScreen
          onComplete={() => {
            void routeLoggedInTutor();
          }}
          onLater={() => {
            void routeLoggedInTutor();
          }}
          onDeferChange={setRateCardCanDefer}
        />
      </View>
    );
  } else if (currentView === 'tutorHome') {
    screen = renderTutorShell(
      'home',
      <TutorNavHeader title="Home" onLogout={handleLogout} />,
      <TutorHomeScreen
        onSetRateCard={() => setCurrentView('tutorRateCardSetup')}
        onUpdateCalendar={() => openTutorCalendar('tutorHome')}
        onOpenConcludedClasses={() => setCurrentView('tutorConcludedClasses')}
        onOpenBookingHistory={() => setCurrentView('tutorBookingHistory')}
        onJoinOnlineClass={(sessionId) => {
          setOnlineClassSession({
            sessionId,
            returnView: 'tutorHome',
            displayName: 'Tutor',
            canEndClass: true,
          });
          setCurrentView('onlineClass');
        }}
        onActOnRefundClaim={(claimId) => {
          setTutorPostClassRefundClaimId(claimId);
          setCurrentView('tutorPostClassRefundClaim');
        }}
      />,
    );
  } else if (currentView === 'tutorBookingHistory') {
    screen = renderTutorShell(
      null,
      <TutorNavHeader
        title="Booking history"
        onBack={() => setCurrentView('tutorHome')}
        onLogout={handleLogout}
      />,
      <TutorBookingHistoryScreen />,
      { backgroundColor: '#e8f4ff' },
    );
  } else if (currentView === 'tutorConcludedClasses') {
    screen = renderTutorShell(
      null,
      <TutorNavHeader
        title="Concluded classes"
        onBack={() => setCurrentView('tutorHome')}
        onLogout={handleLogout}
      />,
      <TutorConcludedClassesScreen
        onActOnRefundClaim={(claimId) => {
          setTutorPostClassRefundClaimId(claimId);
          setCurrentView('tutorPostClassRefundClaim');
        }}
      />,
      { backgroundColor: '#e8f4ff' },
    );
  } else if (currentView === 'tutorPostClassRefundClaim' && tutorPostClassRefundClaimId != null) {
    screen = renderTutorShell(
      null,
      <TutorNavHeader
        title="Refund request"
        onBack={() => {
          setTutorPostClassRefundClaimId(null);
          setCurrentView('tutorConcludedClasses');
        }}
        onLogout={handleLogout}
      />,
      <TutorPostClassRefundClaimScreen
        claimId={tutorPostClassRefundClaimId}
        onComplete={() => {
          setTutorPostClassRefundClaimId(null);
          setCurrentView('tutorConcludedClasses');
        }}
      />,
      { backgroundColor: '#e8f4ff' },
    );
  } else if (currentView === 'tutorCalendar') {
    screen = forceWeeklyAvailability ? (
      <View style={{ flex: 1 }}>
        <NavHeader title="Weekly availability" onLogout={handleLogout} />
        <TutorCalendarScreen
          onSetupComplete={() => {
            void routeLoggedInTutor();
          }}
        />
      </View>
    ) : renderTutorShell(
      'calendar',
      <TutorNavHeader
        title="Calendar"
        onBack={() => setCurrentView(tutorCalendarReturnView)}
        onLogout={handleLogout}
      />,
      <TutorCalendarScreen
        onSetupComplete={() => {
          void routeLoggedInTutor();
        }}
      />,
    );
  } else if (currentView === 'tutorProfile') {
    screen = renderTutorShell(
      'profile',
      <TutorNavHeader title="My profile" onLogout={handleLogout} />,
      <TutorDetailScreen
        onOpenCalendar={() => openTutorCalendar('tutorProfile')}
        onAccountDeleted={() => {
          void handleAccountDeleted();
        }}
      />,
    );
  } else if (currentView === 'wallet') {
    const studentWallet = isStudentWalletTabContext(walletReturnView);
    const tutorWallet = isTutorWalletTabContext(walletReturnView);
    const walletBack = studentWallet
      ? goStudentHome
      : tutorWallet
        ? goTutorHome
        : handleWalletBack;
    screen = studentWallet
      ? renderStudentShell(
          'wallet',
          <StudentNavHeader title="Wallet" onLogout={handleLogout} />,
          <WalletScreen onBack={walletBack} />,
        )
      : tutorWallet
        ? renderTutorShell(
            'wallet',
            <TutorNavHeader title="Wallet" onLogout={handleLogout} />,
            <WalletScreen onBack={walletBack} />,
          )
        : (
          <View style={{ flex: 1 }}>
            <NavHeader
              title="Wallet"
              onBack={handleWalletBack}
              onLogout={handleLogout}
            />
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

  const analyticsScreen =
    studentCartOverlay === 'checkout'
      ? 'studentCartCheckout'
      : studentCartOverlay === 'cart'
        ? 'studentCart'
        : currentView;

  const tutorCalendarWithoutTabBar =
    currentView === 'tutorCalendar' && forceWeeklyAvailability;
  const hostBottomInset = screenHostBottomInset(
    currentView,
    walletReturnView,
    tutorCalendarWithoutTabBar,
  );

  const studentCartOverlayNode = studentCartOverlay ? (
    <View
      style={[
        studentCartOverlayStyles.root,
        androidBottomInset() > 0 ? { paddingBottom: androidBottomInset() } : null,
      ]}
    >
      {studentCartOverlay === 'cart' ? (
        <>
          <StudentNavHeader
            title="Cart"
            onBack={closeStudentCartOverlay}
            onLogout={handleLogout}
            onOpenCart={openStudentCart}
          />
          <StudentCartScreen
            onCheckout={() => setStudentCartOverlay('checkout')}
            onKeepShopping={() => {
              closeStudentCartOverlay();
              setCurrentView('studentTutorSearch');
            }}
          />
        </>
      ) : (
        <>
          <StudentNavHeader
            title="Checkout"
            onBack={() => setStudentCartOverlay('cart')}
            onLogout={handleLogout}
          />
          <StudentCartCheckoutScreen
            onScheduleNow={() => {
              closeStudentCartOverlay();
              setCurrentView('studentClassCredits');
            }}
          />
        </>
      )}
    </View>
  ) : null;

  return (
    <View style={appStyles.root}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={
          Platform.OS === 'android' && Number(Platform.Version) >= 35
            ? 'transparent'
            : '#f8fafc'
        }
        translucent={Platform.OS === 'android' && Number(Platform.Version) >= 35}
      />
      <AnalyticsViewTracker screenName={analyticsScreen} />
      <View
        style={[
          appStyles.screenHost,
          hostBottomInset > 0 ? { paddingBottom: hostBottomInset } : null,
        ]}
      >
        {screen}
      </View>
      {studentCartOverlayNode}
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
    </View>
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

const appStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  screenHost: {
    flex: 1,
  },
});

const studentCartOverlayStyles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    zIndex: 20,
  },
});

const pushBannerStyles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 52 + androidTopInset(),
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
