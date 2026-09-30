import { groupUnscheduledClassCredits } from './student-class-credit-groups';

const credit = (
  id: number,
  extra: Partial<{
    tutorOfferingId: number;
    offeringId: number;
    deliveryMode: string;
    offeringLabel: string;
  }> = {},
) => ({
  id,
  tutorId: 3,
  offeringId: extra.offeringId ?? 30,
  tutorOfferingId: extra.tutorOfferingId ?? 80,
  tutorName: 'Anita Sharma',
  offeringLabel: extra.offeringLabel ?? 'CBSE Mathematics Class 11',
  deliveryMode: extra.deliveryMode ?? 'offline',
});

describe('groupUnscheduledClassCredits', () => {
  it('collapses the same tutor, subject, and mode into one group', () => {
    const groups = groupUnscheduledClassCredits([
      credit(1),
      credit(2),
      credit(3),
      credit(4),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].credits.map((row) => row.id)).toEqual([1, 2, 3, 4]);
  });

  it('keeps a different subject or mode as its own group', () => {
    const groups = groupUnscheduledClassCredits([
      credit(1),
      credit(2, { offeringId: 31, offeringLabel: 'Physics' }),
      credit(3, { deliveryMode: 'online' }),
    ]);

    expect(groups).toHaveLength(3);
    expect(groups.map((group) => group.credits.length)).toEqual([1, 1, 1]);
  });
});
