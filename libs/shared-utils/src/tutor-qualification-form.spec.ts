import { EducationalQualification } from './education-qualification.enum';
import { GradeType } from './grade-type.enum';
import {
  buildQualificationMutationInput,
  emptyQualificationRow,
  getAvailableQualificationTypes,
  mapQualificationToFormRow,
  validateQualificationList,
  validateQualificationRow,
} from './tutor-qualification-form';

describe('tutor-qualification-form', () => {
  const validRow = {
    qualificationType: EducationalQualification.BACHELORS,
    boardOrUniversity: 'Delhi University',
    gradeType: GradeType.PERCENTAGE,
    gradeValue: '85',
    yearObtained: '2020',
    fieldOfStudy: 'Commerce',
    degreeName: 'BCom',
  };

  describe('validateQualificationRow', () => {
    it('returns normalized row when valid', () => {
      const result = validateQualificationRow(validRow, new Date('2024-01-01'));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.normalized.degreeName).toBe('BCom');
      }
    });

    it('requires degree name for non higher secondary', () => {
      const result = validateQualificationRow({ ...validRow, degreeName: '  ' });
      expect(result).toEqual({ ok: false, fieldErrors: { degreeName: 'Required' } });
    });

    it('allows empty degree name for higher secondary', () => {
      const result = validateQualificationRow(
        {
          ...validRow,
          qualificationType: EducationalQualification.HIGHER_SECONDARY,
          degreeName: 'Higher Secondary',
        },
        new Date('2024-01-01'),
      );
      expect(result.ok).toBe(true);
    });
  });

  describe('validateQualificationList', () => {
    it('requires higher secondary in list', () => {
      expect(
        validateQualificationList([
          { ...validRow, qualificationType: EducationalQualification.BACHELORS },
        ]),
      ).toEqual({
        ok: false,
        message: 'At least one qualification must be Higher Secondary.',
      });
    });
  });

  describe('buildQualificationMutationInput', () => {
    it('builds mutation payload with display order', () => {
      const input = buildQualificationMutationInput([validRow]);
      expect(input[0]).toEqual({
        qualificationType: EducationalQualification.BACHELORS,
        boardOrUniversity: 'Delhi University',
        gradeType: GradeType.PERCENTAGE,
        gradeValue: '85',
        yearObtained: 2020,
        fieldOfStudy: 'Commerce',
        degreeName: 'BCom',
        displayOrder: 0,
      });
    });
  });

  describe('getAvailableQualificationTypes', () => {
    it('excludes used types and higher secondary', () => {
      expect(
        getAvailableQualificationTypes([
          EducationalQualification.HIGHER_SECONDARY,
          EducationalQualification.BACHELORS,
        ]),
      ).not.toContain(EducationalQualification.BACHELORS);
      expect(
        getAvailableQualificationTypes([
          EducationalQualification.HIGHER_SECONDARY,
          EducationalQualification.BACHELORS,
        ]),
      ).not.toContain(EducationalQualification.HIGHER_SECONDARY);
    });
  });

  describe('mapQualificationToFormRow', () => {
    it('maps API qualification to form row', () => {
      expect(
        mapQualificationToFormRow({
          qualificationType: 'MASTERS',
          boardOrUniversity: 'JNU',
          gradeType: 'CGPA',
          gradeValue: '8.5',
          yearObtained: 2019,
          fieldOfStudy: 'Economics',
          degreeName: 'MA',
        }),
      ).toMatchObject({
        qualificationType: EducationalQualification.MASTERS,
        yearObtained: '2019',
        gradeType: GradeType.CGPA,
      });
    });
  });

  describe('emptyQualificationRow', () => {
    it('defaults higher secondary degree name', () => {
      expect(emptyQualificationRow(EducationalQualification.HIGHER_SECONDARY).degreeName).toBe(
        'Higher Secondary',
      );
    });
  });
});
