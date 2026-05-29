import { buildOnboardingTimeline } from './onboarding-timeline';

describe('buildOnboardingTimeline', () => {
  const baseInput = {
    certificationStage: 'docs',
    regFeePaid: false,
    regFeeDate: null,
    addresses: [{ createdDate: '2026-05-01T10:00:00.000Z', updatedDate: '2026-05-01T10:00:00.000Z' }],
    qualifications: [{ createdDate: '2026-05-02T10:00:00.000Z', updatedDate: '2026-05-02T11:00:00.000Z' }],
    experiences: [{ createdDate: '2026-05-03T09:00:00.000Z', updatedDate: '2026-05-03T09:30:00.000Z' }],
    offerings: [
      {
        createdDate: '2026-05-04T08:00:00.000Z',
        passedAt: '2026-05-05T14:00:00.000Z',
      },
      {
        createdDate: '2026-05-04T08:05:00.000Z',
        passedAt: '2026-05-06T16:00:00.000Z',
      },
    ],
    documents: [{ createdDate: '2026-05-07T12:00:00.000Z' }],
  };

  it('derives latest timestamps per stage from related records', () => {
    const entries = buildOnboardingTimeline(baseInput);

    expect(entries.find((e) => e.id === 'address')?.completedAt).toBe(
      '2026-05-01T10:00:00.000Z',
    );
    expect(entries.find((e) => e.id === 'qualification')?.completedAt).toBe(
      '2026-05-02T11:00:00.000Z',
    );
    expect(entries.find((e) => e.id === 'experience')?.completedAt).toBe(
      '2026-05-03T09:30:00.000Z',
    );
    expect(entries.find((e) => e.id === 'offerings')?.completedAt).toBe(
      '2026-05-04T08:05:00.000Z',
    );
    expect(entries.find((e) => e.id === 'pt')?.completedAt).toBe(
      '2026-05-06T16:00:00.000Z',
    );
    expect(entries.find((e) => e.id === 'docs')?.completedAt).toBe(
      '2026-05-07T12:00:00.000Z',
    );
  });

  it('marks registration payment as skipped when past stage without payment', () => {
    const entries = buildOnboardingTimeline(baseInput);
    const reg = entries.find((e) => e.id === 'registrationPayment');

    expect(reg?.status).toBe('skipped');
    expect(reg?.completedAt).toBeNull();
  });

  it('uses regFeeDate when payment was received', () => {
    const entries = buildOnboardingTimeline({
      ...baseInput,
      regFeePaid: true,
      regFeeDate: '2026-05-06T10:00:00.000Z',
    });
    const reg = entries.find((e) => e.id === 'registrationPayment');

    expect(reg?.status).toBe('completed');
    expect(reg?.completedAt).toBe('2026-05-06T10:00:00.000Z');
  });

  it('marks the current certification stage as in progress', () => {
    const entries = buildOnboardingTimeline({
      ...baseInput,
      certificationStage: 'experience',
      addresses: baseInput.addresses,
      qualifications: [],
      experiences: [],
    });
    const experience = entries.find((e) => e.id === 'experience');

    expect(experience?.status).toBe('current');
    expect(experience?.completedAt).toBeNull();
  });
});
