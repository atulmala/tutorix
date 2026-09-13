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
  it('returns studentHome from student home or onboarding', () => {
    expect(walletReturnFromPush('studentHome')).toBe('studentHome');
    expect(walletReturnFromPush('studentOnboarding')).toBe('studentHome');
  });

  it('returns studentProfile when the student is already on profile', () => {
    expect(walletReturnFromPush('studentProfile')).toBe('studentProfile');
  });

  it('leaves tutors on tutorProfile', () => {
    expect(walletReturnFromPush('tutorProfile')).toBe('tutorProfile');
  });
});

describe('tutorViewAfterProfile', () => {
  it('still lands onboarded tutors on tutorProfile', () => {
    expect(
      tutorViewAfterProfile({
        onBoardingComplete: true,
        onboardingCelebrationSeen: true,
      }),
    ).toBe('tutorProfile');
  });
});
