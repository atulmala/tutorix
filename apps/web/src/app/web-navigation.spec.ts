import {
  studentViewAfterProfile,
  tutorViewAfterProfile,
  walletReturnFromView,
} from './web-navigation';

describe('studentViewAfterProfile', () => {
  it('sends onboarded students to student-home', () => {
    expect(studentViewAfterProfile({ onBoardingComplete: true })).toBe(
      'student-home',
    );
  });

  it('sends incomplete students to onboarding', () => {
    expect(studentViewAfterProfile({ onBoardingComplete: false })).toBe(
      'student-onboarding',
    );
  });
});

describe('tutorViewAfterProfile', () => {
  it('sends onboarded tutors to tutor-home', () => {
    expect(
      tutorViewAfterProfile({
        onBoardingComplete: true,
        onboardingCelebrationSeen: true,
      }),
    ).toBe('tutor-home');
  });

  it('keeps incomplete tutors on onboarding', () => {
    expect(
      tutorViewAfterProfile({
        onBoardingComplete: false,
        onboardingCelebrationSeen: false,
      }),
    ).toBe('tutor-onboarding');
  });
});

describe('walletReturnFromView', () => {
  it('returns home or profile for the current student or tutor screen', () => {
    expect(walletReturnFromView('student-home')).toBe('student-home');
    expect(walletReturnFromView('student-profile')).toBe('student-profile');
    expect(walletReturnFromView('tutor-home')).toBe('tutor-home');
    expect(walletReturnFromView('tutor-profile')).toBe('tutor-profile');
  });
});
