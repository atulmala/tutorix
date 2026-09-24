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
  | 'studentTutorBooking'
  | 'studentTutorBookingConfirm'
  | 'wallet'
  | 'home';

export type WalletReturnView =
  | 'tutorHome'
  | 'tutorProfile'
  | 'studentProfile'
  | 'studentHome'
  | 'studentTutorBookingConfirm';

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
  if (
    view === 'studentHome' ||
    view === 'studentOnboarding' ||
    view === 'studentTutorSearch' ||
    view === 'studentTutorSearchResults' ||
    view === 'studentTutorPreview' ||
    view === 'studentTutorBooking'
  ) {
    return 'studentHome';
  }
  if (view === 'studentTutorBookingConfirm') {
    return 'studentTutorBookingConfirm';
  }
  if (view === 'studentProfile') {
    return 'studentProfile';
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
