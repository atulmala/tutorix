export type AppView =
  | 'splash'
  | 'login'
  | 'forgotPassword'
  | 'signup'
  | 'tutorOnboarding'
  | 'tutorBankSetup'
  | 'tutorRateCardSetup'
  | 'tutorHome'
  | 'tutorCalendar'
  | 'tutorProfile'
  | 'studentOnboarding'
  | 'studentHome'
  | 'studentProfile'
  | 'studentTutorSearch'
  | 'studentTutorSearchResults'
  | 'studentTutorPreview'
  | 'studentCart'
  | 'studentCartCheckout'
  | 'studentClassCredits'
  | 'studentClassSchedule'
  | 'studentConcludedClasses'
  | 'studentBookingHistory'
  | 'tutorConcludedClasses'
  | 'tutorBookingHistory'
  | 'wallet'
  | 'home';

export type WalletReturnView =
  | 'tutorHome'
  | 'tutorProfile'
  | 'studentProfile'
  | 'studentHome'
  | 'studentTutorSearch'
  | 'studentTutorSearchResults'
  | 'studentTutorPreview'
  | 'studentClassCredits'
  | 'studentClassSchedule'
  | 'studentConcludedClasses'
  | 'studentBookingHistory'
  | 'tutorConcludedClasses'
  | 'tutorBookingHistory'
  /** @deprecated Checkout is a cart overlay; prefer restoring overlay state. */
  | 'studentCartCheckout';

export type StudentCartOverlay = 'cart' | 'checkout';

const STUDENT_CART_RETURN_VIEWS = [
  'studentHome',
  'studentProfile',
  'studentTutorSearch',
  'studentTutorSearchResults',
  'studentTutorPreview',
  'studentClassCredits',
  'studentClassSchedule',
  'studentConcludedClasses',
  'studentBookingHistory',
] as const satisfies readonly AppView[];

export type StudentCartReturnView = (typeof STUDENT_CART_RETURN_VIEWS)[number];

export function isStudentCartReturnView(
  view: AppView,
): view is StudentCartReturnView {
  return (STUDENT_CART_RETURN_VIEWS as readonly AppView[]).includes(view);
}

export type StudentRouteProfile = {
  onBoardingComplete?: boolean;
  onboardingStage?: string | null;
};

export function studentViewAfterProfile(
  student: StudentRouteProfile | null | undefined,
): AppView {
  if (!student) {
    return 'home';
  }
  if (!student.onBoardingComplete) {
    return 'studentOnboarding';
  }
  return 'studentHome';
}

export function walletReturnFromPush(view: AppView): WalletReturnView | null {
  if (view === 'studentOnboarding') {
    return 'studentHome';
  }
  if (view === 'studentCart' || view === 'studentCartCheckout') {
    return 'studentHome';
  }
  if (isStudentCartReturnView(view)) {
    return view;
  }
  if (view === 'tutorConcludedClasses') {
    return 'tutorConcludedClasses';
  }
  if (view === 'tutorBookingHistory') {
    return 'tutorBookingHistory';
  }
  if (view === 'tutorHome' || view === 'tutorOnboarding' || view === 'tutorBankSetup' || view === 'tutorRateCardSetup' || view === 'tutorCalendar') {
    return 'tutorHome';
  }
  if (view === 'tutorProfile') {
    return 'tutorProfile';
  }
  if (view === 'wallet') {
    return null;
  }
  return 'tutorHome';
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
): AppView {
  if (!tutor) {
    return 'home';
  }
  if (!tutor.onBoardingComplete || !tutor.onboardingCelebrationSeen) {
    return 'tutorOnboarding';
  }
  if (!tutor.bankDetailsComplete) {
    return 'tutorBankSetup';
  }
  if (tutor.needsRateCardSetup) {
    return 'tutorRateCardSetup';
  }
  if (tutor.needsWeeklyAvailabilitySetup) {
    return 'tutorCalendar';
  }
  return 'tutorHome';
}
