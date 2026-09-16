import {
  studentViewAfterProfile,
  tutorViewAfterProfile,
  walletReturnFromPush,
} from './student-navigation';

describe('studentViewAfterProfile', () => {
  it('sends onboarded students to studentHome', () => {
    expect(studentViewAfterProfile({ onBoardingComplete: true })).toBe(
      'studentHome',
    );
  });

  it('sends incomplete students to onboarding', () => {
    expect(
      studentViewAfterProfile({
        onBoardingComplete: false,
        onboardingStage: 'parent',
      }),
    ).toBe('studentOnboarding');
  });

  it('falls back to generic home when there is no student profile', () => {
    expect(studentViewAfterProfile(null)).toBe('home');
  });
});

describe('walletReturnFromPush', () => {
  it('returns studentHome from student home, onboarding, search, or tutor preview', () => {
    expect(walletReturnFromPush('studentHome')).toBe('studentHome');
    expect(walletReturnFromPush('studentOnboarding')).toBe('studentHome');
    expect(walletReturnFromPush('studentTutorSearch')).toBe('studentHome');
    expect(walletReturnFromPush('studentTutorPreview')).toBe('studentHome');
  });

  it('returns studentProfile when the student is already on profile', () => {
    expect(walletReturnFromPush('studentProfile')).toBe('studentProfile');
  });

  it('returns tutorHome from tutor home or onboarding', () => {
    expect(walletReturnFromPush('tutorHome')).toBe('tutorHome');
    expect(walletReturnFromPush('tutorOnboarding')).toBe('tutorHome');
  });

  it('returns tutorProfile when the tutor is already on profile', () => {
    expect(walletReturnFromPush('tutorProfile')).toBe('tutorProfile');
  });
});

describe('tutorViewAfterProfile', () => {
  it('lands onboarded tutors on tutorHome', () => {
    expect(
      tutorViewAfterProfile({
        onBoardingComplete: true,
        onboardingCelebrationSeen: true,
      }),
    ).toBe('tutorHome');
  });

  it('keeps incomplete tutors on onboarding', () => {
    expect(
      tutorViewAfterProfile({
        onBoardingComplete: false,
        onboardingCelebrationSeen: false,
      }),
    ).toBe('tutorOnboarding');
  });
});
