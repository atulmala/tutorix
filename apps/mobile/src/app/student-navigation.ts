export type AppView =
  | 'splash'
  | 'login'
  | 'forgotPassword'
  | 'signup'
  | 'tutorOnboarding'
  | 'tutorProfile'
  | 'studentOnboarding'
  | 'studentHome'
  | 'studentProfile'
  | 'wallet'
  | 'home';

export type WalletReturnView = 'tutorProfile' | 'studentProfile' | 'studentHome';

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
  if (view === 'studentHome' || view === 'studentOnboarding') {
    return 'studentHome';
  }
  if (view === 'studentProfile') {
    return 'studentProfile';
  }
  if (view === 'wallet') {
    return null;
  }
  return 'tutorProfile';
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
  return 'tutorProfile';
}
