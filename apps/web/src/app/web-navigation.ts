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
  | 'tutor-home'
  | 'tutor-profile'
  | 'student-onboarding'
  | 'student-home'
  | 'student-profile'
  | 'wallet'
  | 'privacy'
  | 'terms';

export type WalletReturnView =
  | 'tutor-home'
  | 'tutor-profile'
  | 'student-home'
  | 'student-profile';

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

export function tutorViewAfterProfile(tutor: {
  onBoardingComplete?: boolean;
  onboardingCelebrationSeen?: boolean;
} | null | undefined): WebView {
  if (!tutor) {
    return 'home';
  }
  if (!tutor.onBoardingComplete || !tutor.onboardingCelebrationSeen) {
    return 'tutor-onboarding';
  }
  return 'tutor-home';
}

export function walletReturnFromView(view: WebView): WalletReturnView | null {
  if (view === 'student-home' || view === 'student-onboarding') {
    return 'student-home';
  }
  if (view === 'student-profile') {
    return 'student-profile';
  }
  if (view === 'tutor-home' || view === 'tutor-onboarding') {
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
