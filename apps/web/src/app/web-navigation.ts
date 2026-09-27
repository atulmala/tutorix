export type WebView =
  | 'home'
  | 'for-students'
  | 'for-tutors'
  | 'signup'
  | 'login'
  | 'forgot-password'
  | 'reset-password'
  | 'password-reset-ack'
  | 'tutor-onboarding'
  | 'tutor-bank-setup'
  | 'tutor-rate-card-setup'
  | 'tutor-home'
  | 'tutor-calendar'
  | 'tutor-profile'
  | 'student-onboarding'
  | 'student-home'
  | 'student-profile'
  | 'student-tutor-search'
  | 'student-tutor-preview'
  | 'student-cart'
  | 'student-cart-checkout'
  | 'student-class-credits'
  | 'student-class-schedule'
  | 'wallet'
  | 'privacy'
  | 'terms';

export type WalletReturnView =
  | 'tutor-home'
  | 'tutor-profile'
  | 'student-home'
  | 'student-profile'
  | 'student-tutor-search'
  | 'student-tutor-preview'
  | 'student-class-credits'
  | 'student-class-schedule'
  /** @deprecated Checkout is a cart overlay; prefer restoring overlay state. */
  | 'student-cart-checkout';

export type StudentCartOverlay = 'cart' | 'checkout';

const STUDENT_CART_RETURN_VIEWS = [
  'student-home',
  'student-profile',
  'student-tutor-search',
  'student-tutor-preview',
  'student-class-credits',
  'student-class-schedule',
] as const satisfies readonly WebView[];

export type StudentCartReturnView = (typeof STUDENT_CART_RETURN_VIEWS)[number];

export function isStudentCartReturnView(
  view: WebView,
): view is StudentCartReturnView {
  return (STUDENT_CART_RETURN_VIEWS as readonly WebView[]).includes(view);
}

export function studentViewAfterProfile(
  student: {
    onBoardingComplete?: boolean;
    onboardingStage?: string | null;
  } | null | undefined,
): WebView {
  if (!student) {
    return 'home';
  }
  if (!student.onBoardingComplete) {
    return 'student-onboarding';
  }
  return 'student-home';
}

export type TutorRouteProfile = {
  onBoardingComplete?: boolean;
  onboardingCelebrationSeen?: boolean;
  bankDetailsComplete?: boolean;
  needsRateCardSetup?: boolean;
  needsWeeklyAvailabilitySetup?: boolean;
};

export function tutorViewAfterProfile(
  tutor: TutorRouteProfile | null | undefined,
): WebView {
  if (!tutor) {
    return 'home';
  }
  if (!tutor.onBoardingComplete || !tutor.onboardingCelebrationSeen) {
    return 'tutor-onboarding';
  }
  if (!tutor.bankDetailsComplete) {
    return 'tutor-bank-setup';
  }
  if (tutor.needsRateCardSetup) {
    return 'tutor-rate-card-setup';
  }
  if (tutor.needsWeeklyAvailabilitySetup) {
    return 'tutor-calendar';
  }
  return 'tutor-home';
}

export function walletReturnFromView(view: WebView): WalletReturnView | null {
  if (view === 'student-onboarding') {
    return 'student-home';
  }
  if (view === 'student-cart' || view === 'student-cart-checkout') {
    return 'student-home';
  }
  if (isStudentCartReturnView(view)) {
    return view;
  }
  if (view === 'tutor-home' || view === 'tutor-onboarding' || view === 'tutor-bank-setup' || view === 'tutor-rate-card-setup' || view === 'tutor-calendar') {
    return 'tutor-home';
  }
  if (view === 'tutor-profile') {
    return 'tutor-profile';
  }
  if (view === 'wallet') {
    return null;
  }
  return null;
}
