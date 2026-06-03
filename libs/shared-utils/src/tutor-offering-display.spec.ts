import {
  formatOfferingLabelForDisplay,
  formatTutorOfferingFullLabel,
  parseTutorOfferingLabelSegments,
  type OfferingNodeForLabel,
} from './tutor-offering-display';

function offering(
  partial: Partial<OfferingNodeForLabel> & Pick<OfferingNodeForLabel, 'id' | 'displayName' | 'level'>,
): OfferingNodeForLabel {
  return {
    mediumOfInstruction: 1,
    ...partial,
  };
}

function buildSchoolEducationTree(): Map<number, OfferingNodeForLabel> {
  const root = offering({ id: 1, displayName: 'School Education', level: 0 });
  const board = offering({
    id: 10,
    displayName: 'CBSE',
    level: 1,
    parentOffering: { id: root.id },
  });
  const grade1 = offering({
    id: 101,
    displayName: 'Class 1',
    level: 2,
    parentOffering: { id: board.id },
  });
  const grade4 = offering({
    id: 100,
    displayName: 'Class 4',
    level: 2,
    parentOffering: { id: board.id },
  });
  const grade5 = offering({
    id: 105,
    displayName: 'Class 5',
    level: 2,
    parentOffering: { id: board.id },
  });
  const maths1 = offering({
    id: 1001,
    displayName: 'Mathematics',
    level: 3,
    parentOffering: { id: grade1.id },
    mediumOfInstruction: 1,
  });
  const maths4 = offering({
    id: 1000,
    displayName: 'Mathematics',
    level: 3,
    parentOffering: { id: grade4.id },
    mediumOfInstruction: 1,
  });
  const maths5 = offering({
    id: 1005,
    displayName: 'Mathematics',
    level: 3,
    parentOffering: { id: grade5.id },
    mediumOfInstruction: 1,
  });
  const kindergarten = offering({
    id: 200,
    displayName: 'Kindergarten',
    level: 2,
    parentOffering: { id: board.id },
  });
  const kinderMath = offering({
    id: 2000,
    displayName: 'Mathematics',
    level: 3,
    parentOffering: { id: kindergarten.id },
    mediumOfInstruction: 2,
  });

  return new Map(
    [
      root,
      board,
      grade1,
      grade4,
      grade5,
      maths1,
      maths4,
      maths5,
      kindergarten,
      kinderMath,
    ].map((o) => [o.id, o]),
  );
}

function buildStudyAbroadTree(): Map<number, OfferingNodeForLabel> {
  const root = offering({ id: 2, displayName: 'Study Abroad', level: 0 });
  const ielts = offering({
    id: 20,
    displayName: 'IELTS',
    level: 1,
    parentOffering: { id: root.id },
  });
  const reading = offering({
    id: 200,
    displayName: 'Ielts Academic Reading',
    level: 2,
    parentOffering: { id: ielts.id },
  });

  return new Map([root, ielts, reading].map((o) => [o.id, o]));
}

describe('formatTutorOfferingFullLabel', () => {
  it('formats school education with class range from proficiency test offerings', () => {
    const byId = buildSchoolEducationTree();
    const leaf = byId.get(1001)!;

    expect(
      formatTutorOfferingFullLabel(leaf, byId, {
        proficiencyTestOfferingIds: [1001, 1000, 1005],
      }),
    ).toBe('CBSE | English | Mathematics | Classes 1 - 5');
  });

  it('formats a single class when no PT offering list is provided', () => {
    const byId = buildSchoolEducationTree();
    const leaf = byId.get(1000)!;

    expect(formatTutorOfferingFullLabel(leaf, byId)).toBe(
      'CBSE | English | Mathematics | Classes 4',
    );
  });

  it('uses grade name when class number is not parseable', () => {
    const byId = buildSchoolEducationTree();
    const leaf = byId.get(2000)!;

    expect(formatTutorOfferingFullLabel(leaf, byId)).toBe(
      'CBSE | Hindi | Mathematics | Kindergarten',
    );
  });

  it('formats non-school study areas with full path segments', () => {
    const byId = buildStudyAbroadTree();
    const leaf = byId.get(200)!;

    expect(formatTutorOfferingFullLabel(leaf, byId)).toBe(
      'IELTS | Ielts Academic Reading',
    );
  });

  it('falls back to leaf display name when tree is unknown', () => {
    const leaf = offering({ id: 99, displayName: 'Orphan Subject', level: 3 });

    expect(formatTutorOfferingFullLabel(leaf, new Map())).toBe('Orphan Subject');
  });
});

describe('parseTutorOfferingLabelSegments', () => {
  it('splits pipe-separated labels', () => {
    expect(parseTutorOfferingLabelSegments('CBSE | English | Classes 1 - 5')).toEqual([
      'CBSE',
      'English',
      'Classes 1 - 5',
    ]);
  });

  it('parses legacy space-separated school labels', () => {
    expect(parseTutorOfferingLabelSegments('CBSE English Class 1 - 5')).toEqual([
      'CBSE',
      'English',
      'Classes 1 - 5',
    ]);
  });
});

describe('formatOfferingLabelForDisplay', () => {
  it('adds pipes to legacy labels', () => {
    expect(formatOfferingLabelForDisplay('CBSE English Class 1 - 5')).toBe(
      'CBSE | English | Classes 1 - 5',
    );
  });
});
