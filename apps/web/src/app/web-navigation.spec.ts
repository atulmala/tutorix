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
  it('sends onboarded tutors with bank details and a rate card to tutor-home', () => {
    expect(
      tutorViewAfterProfile({
        onBoardingComplete: true,
        onboardingCelebrationSeen: true,
        bankDetailsComplete: true,
        needsRateCardSetup: false,
      }),
    ).toBe('tutor-home');
  });

  it('sends certified tutors without bank details to account setup', () => {
    expect(
      tutorViewAfterProfile({
        onBoardingComplete: true,
        onboardingCelebrationSeen: true,
        bankDetailsComplete: false,
      }),
    ).toBe('tutor-bank-setup');
  });

  it('sends certified tutors without a rate card to rate card setup', () => {
    expect(
      tutorViewAfterProfile({
        onBoardingComplete: true,
        onboardingCelebrationSeen: true,
        bankDetailsComplete: true,
        needsRateCardSetup: true,
      }),
    ).toBe('tutor-rate-card-setup');
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
    expect(walletReturnFromView('student-tutor-search')).toBe('student-home');
    expect(walletReturnFromView('student-tutor-preview')).toBe('student-home');
    expect(walletReturnFromView('student-profile')).toBe('student-profile');
    expect(walletReturnFromView('tutor-home')).toBe('tutor-home');
    expect(walletReturnFromView('tutor-calendar')).toBe('tutor-home');
    expect(walletReturnFromView('tutor-profile')).toBe('tutor-profile');
  });
});
