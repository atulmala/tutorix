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
    expect(walletReturnFromPush('tutorCalendar')).toBe('tutorHome');
  });

  it('returns tutorProfile when the tutor is already on profile', () => {
    expect(walletReturnFromPush('tutorProfile')).toBe('tutorProfile');
  });
});

describe('tutorViewAfterProfile', () => {
  it('lands onboarded tutors with bank details and a rate card on tutorHome', () => {
    expect(
      tutorViewAfterProfile({
        onBoardingComplete: true,
        onboardingCelebrationSeen: true,
        bankDetailsComplete: true,
        needsRateCardSetup: false,
      }),
    ).toBe('tutorHome');
  });

  it('sends certified tutors without bank details to tutorBankSetup', () => {
    expect(
      tutorViewAfterProfile({
        onBoardingComplete: true,
        onboardingCelebrationSeen: true,
        bankDetailsComplete: false,
      }),
    ).toBe('tutorBankSetup');
  });

  it('sends certified tutors without a rate card to tutorRateCardSetup', () => {
    expect(
      tutorViewAfterProfile({
        onBoardingComplete: true,
        onboardingCelebrationSeen: true,
        bankDetailsComplete: true,
        needsRateCardSetup: true,
      }),
    ).toBe('tutorRateCardSetup');
  });

  it('sends tutors without weekly availability to tutorCalendar', () => {
    expect(
      tutorViewAfterProfile({
        onBoardingComplete: true,
        onboardingCelebrationSeen: true,
        bankDetailsComplete: true,
        needsRateCardSetup: false,
        needsWeeklyAvailabilitySetup: true,
      }),
    ).toBe('tutorCalendar');
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
