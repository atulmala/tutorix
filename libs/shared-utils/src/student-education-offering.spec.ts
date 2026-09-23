import { mapStudentEducationToOfferingPath } from './student-education-offering';
import type { OfferingNodeForLabel } from './tutor-offering-display';

describe('mapStudentEducationToOfferingPath', () => {
  const offerings: OfferingNodeForLabel[] = [
    { id: 1, displayName: 'School Education', level: 0 },
    {
      id: 2,
      displayName: 'CBSE',
      level: 1,
      parentOffering: { id: 1 },
      rootOffering: { id: 1, displayName: 'School Education' },
    },
    {
      id: 3,
      displayName: 'Class 8',
      level: 2,
      parentOffering: { id: 2 },
      rootOffering: { id: 1, displayName: 'School Education' },
    },
  ];

  it('maps CBSE class 8 to catalog nodes', () => {
    const path = mapStudentEducationToOfferingPath('CBSE', 8, offerings);
    expect(path).toEqual({
      studyAreaKey: 'SCHOOL_EDUCATION',
      rootOfferingId: 1,
      boardOfferingId: 2,
      classOfferingId: 3,
    });
  });

  it('matches board from parent offering when rootOffering is missing', () => {
    const path = mapStudentEducationToOfferingPath('CBSE', 8, [
      { id: 1, displayName: 'School Education', level: 0 },
      { id: 2, displayName: 'CBSE', level: 1, parentOffering: { id: 1 } },
      { id: 3, displayName: 'Class 8', level: 2, parentOffering: { id: 2 } },
    ]);
    expect(path).toMatchObject({
      boardOfferingId: 2,
      classOfferingId: 3,
    });
  });
});
