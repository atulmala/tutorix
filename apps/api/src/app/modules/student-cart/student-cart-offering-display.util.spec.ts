import type { OfferingNodeForLabel } from '@tutorix/shared-utils';
import { resolveStudentCartOfferingDisplay } from './student-cart-offering-display.util';

function offering(
  partial: Partial<OfferingNodeForLabel> & Pick<OfferingNodeForLabel, 'id' | 'displayName' | 'level'>,
): OfferingNodeForLabel {
  return { mediumOfInstruction: 1, ...partial };
}

describe('resolveStudentCartOfferingDisplay', () => {
  it('uses the searched catalog offering, not the tutor PT leaf', () => {
    const byId = new Map<number, OfferingNodeForLabel>([
      [
        1,
        offering({ id: 1, displayName: 'School Education', level: 0 }),
      ],
      [
        10,
        offering({
          id: 10,
          displayName: 'CBSE',
          level: 1,
          parentOffering: { id: 1 },
        }),
      ],
      [
        101,
        offering({
          id: 101,
          displayName: 'Class 1',
          level: 2,
          parentOffering: { id: 10 },
        }),
      ],
      [
        103,
        offering({
          id: 103,
          displayName: 'Class 3',
          level: 2,
          parentOffering: { id: 10 },
        }),
      ],
      [
        1001,
        offering({
          id: 1001,
          displayName: 'English',
          level: 3,
          parentOffering: { id: 101 },
        }),
      ],
      [
        1003,
        offering({
          id: 1003,
          displayName: 'English',
          level: 3,
          parentOffering: { id: 103 },
        }),
      ],
    ]);

    const fromSearch = resolveStudentCartOfferingDisplay(
      1003,
      1001,
      'English',
      byId,
    );
    expect(fromSearch.offeringId).toBe(1003);
    expect(fromSearch.offeringLabel).toBe('CBSE | English | Classes 3');

    const tutorLeafOnly = resolveStudentCartOfferingDisplay(
      null,
      1001,
      'English',
      byId,
    );
    expect(tutorLeafOnly.offeringLabel).toBe('CBSE | English | Classes 1');
  });
});
