export type AppView =
  | 'splash'
  | 'login'
  | 'forgotPassword'
  | 'signup'
  | 'tutorOnboarding'
  | 'tutorHome'
  | 'tutorProfile'
  | 'studentOnboarding'
  | 'studentHome'
  | 'studentProfile'
  | 'studentTutorSearch'
  | 'studentTutorPreview'
  | 'wallet'
  | 'home';

export type WalletReturnView =
  | 'tutorHome'
  | 'tutorProfile'
  | 'studentProfile'
  | 'studentHome';

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
    view === 'studentTutorPreview'
  ) {
    return 'studentHome';
  }
  if (view === 'studentProfile') {
    return 'studentProfile';
  }
  if (view === 'tutorHome' || view === 'tutorOnboarding') {
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

export function tutorViewAfterProfile(tutor: {
  onBoardingComplete?: boolean;
  onboardingCelebrationSeen?: boolean;
} | null | undefined): AppView {
  if (!tutor) {
    return 'home';
  }
  if (!tutor.onBoardingComplete || !tutor.onboardingCelebrationSeen) {
    return 'tutorOnboarding';
  }
  return 'tutorHome';
}
