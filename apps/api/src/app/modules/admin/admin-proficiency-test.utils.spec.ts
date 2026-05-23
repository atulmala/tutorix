import { mapProficiencyTestToListItem } from './admin-proficiency-test.utils';
import { OfferingEntity } from '../offerings/entities/offering.entity';
import { ProficiencyTestEntity } from '../proficiency/entities/proficiency-test.entity';

function offering(
  partial: Partial<OfferingEntity> & Pick<OfferingEntity, 'id' | 'displayName' | 'level'>,
): OfferingEntity {
  return {
    deleted: false,
    name: partial.displayName,
    order: 0,
    ...partial,
  } as OfferingEntity;
}

function buildSchoolEducationTree(): Map<number, OfferingEntity> {
  const root = offering({ id: 1, displayName: 'School Education', level: 0 });
  const board = offering({
    id: 10,
    displayName: 'CBSE',
    level: 1,
    parentOffering: root,
  });
  const grade4 = offering({
    id: 100,
    displayName: 'Class 4',
    level: 2,
    parentOffering: board,
  });
  const grade5 = offering({
    id: 101,
    displayName: 'Class 5',
    level: 2,
    parentOffering: board,
  });
  const maths4 = offering({
    id: 1000,
    displayName: 'Mathematics',
    level: 3,
    parentOffering: grade4,
  });
  const maths5 = offering({
    id: 1001,
    displayName: 'Mathematics',
    level: 3,
    parentOffering: grade5,
  });

  return new Map(
    [root, board, grade4, grade5, maths4, maths5].map((o) => [o.id, o]),
  );
}

function buildStudyAbroadTree(): Map<number, OfferingEntity> {
  const root = offering({ id: 2, displayName: 'Study Abroad', level: 0 });
  const ielts = offering({
    id: 20,
    displayName: 'IELTS',
    level: 1,
    parentOffering: root,
  });
  const reading = offering({
    id: 200,
    displayName: 'Reading',
    level: 2,
    parentOffering: ielts,
  });

  return new Map([root, ielts, reading].map((o) => [o.id, o]));
}

describe('mapProficiencyTestToListItem', () => {
  it('aggregates multiple school-education leaf offerings', () => {
    const offeringsById = buildSchoolEducationTree();
    const test = {
      id: 42,
      offerings: [offeringsById.get(1000)!, offeringsById.get(1001)!],
    } as ProficiencyTestEntity;

    expect(mapProficiencyTestToListItem(test, offeringsById, 55)).toEqual({
      id: 42,
      studyArea: 'School Education',
      board: 'CBSE',
      classLabel: 'Class 4, Class 5',
      subjects: 'Mathematics',
      questionCount: 55,
      offeringIds: [1000, 1001],
    });
  });

  it('maps 2-level study abroad offerings', () => {
    const offeringsById = buildStudyAbroadTree();
    const test = {
      id: 7,
      offerings: [offeringsById.get(200)!],
    } as ProficiencyTestEntity;

    expect(mapProficiencyTestToListItem(test, offeringsById, 12)).toEqual({
      id: 7,
      studyArea: 'Study Abroad',
      board: 'IELTS',
      classLabel: '—',
      subjects: 'Reading',
      questionCount: 12,
      offeringIds: [200],
    });
  });

  it('returns placeholders when no offerings are linked', () => {
    const test = { id: 1, offerings: [] } as ProficiencyTestEntity;

    expect(mapProficiencyTestToListItem(test, new Map(), 0)).toEqual({
      id: 1,
      studyArea: '—',
      board: '—',
      classLabel: '—',
      subjects: '—',
      questionCount: 0,
      offeringIds: [],
    });
  });
});
