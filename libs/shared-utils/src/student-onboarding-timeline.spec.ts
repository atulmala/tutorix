import { buildStudentOnboardingTimeline } from './student-onboarding-timeline';

describe('buildStudentOnboardingTimeline', () => {
  it('marks parent as current when on parent stage', () => {
    const entries = buildStudentOnboardingTimeline({
      onboardingStage: 'parent',
      onBoardingComplete: false,
      parentRelation: null,
      parentName: null,
      addresses: [],
    });

    expect(entries.find((e) => e.id === 'parent')?.status).toBe('current');
    expect(entries.find((e) => e.id === 'complete')?.status).toBe('pending');
  });

  it('marks all steps completed when onboarding is complete', () => {
    const entries = buildStudentOnboardingTimeline({
      onboardingStage: 'education',
      onBoardingComplete: true,
      parentRelation: 'MOTHER',
      parentName: 'Jane',
      addresses: [{ createdDate: '2026-06-01T00:00:00.000Z' }],
    });

    expect(entries.every((e) => e.status === 'completed')).toBe(true);
  });
});
