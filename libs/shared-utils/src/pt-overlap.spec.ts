import {
  hasPassedOverlappingPt,
  PT_ALREADY_CLEARED_MESSAGE,
} from './pt-overlap';

describe('hasPassedOverlappingPt', () => {
  const class12Maths = {
    id: 1,
    proficiencyTestId: 70,
    status: 'pt_passed',
  };
  const class11Maths = {
    id: 2,
    proficiencyTestId: 70,
    status: 'pending_pt',
  };
  const physics = {
    id: 3,
    proficiencyTestId: 71,
    status: 'pt_passed',
  };

  it('is true when another offering sharing the same PT is already passed', () => {
    expect(
      hasPassedOverlappingPt([class12Maths, class11Maths], class11Maths),
    ).toBe(true);
    expect(
      hasPassedOverlappingPt([class12Maths, class11Maths], class12Maths),
    ).toBe(false);
  });

  it('is false for a different proficiency test', () => {
    expect(hasPassedOverlappingPt([class12Maths, physics], physics)).toBe(false);
  });

  it('exports the already-cleared prompt copy', () => {
    expect(PT_ALREADY_CLEARED_MESSAGE).toBe(
      'PT for this offering has already been cleared',
    );
  });
});
