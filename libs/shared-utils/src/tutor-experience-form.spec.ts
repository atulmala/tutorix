import { EmploymentType } from './employment-type.enum';
import { YearsOfExperienceEnum } from './years-of-experience.enum';
import {
  buildExperienceMutationInput,
  mapEmploymentType,
  mapExperienceToFormRow,
  normalizeYearsOfExperience,
  validateExperienceRow,
} from './tutor-experience-form';

describe('tutor-experience-form', () => {
  describe('mapEmploymentType', () => {
    it('maps numeric API values', () => {
      expect(mapEmploymentType(3)).toBe(EmploymentType.SELF_EMPLOYED);
    });

    it('maps string enum values', () => {
      expect(mapEmploymentType('FREELANCE')).toBe(EmploymentType.FREELANCE);
    });
  });

  describe('validateExperienceRow', () => {
    const validRow = {
      jobTitle: 'Math Teacher',
      employerName: 'ABC School',
      employerAddress: '123 Main St',
      employmentType: EmploymentType.FULL_TIME,
      startDate: '2020-01-01',
      endDate: '2022-06-01',
      isCurrent: false,
    };

    it('returns normalized row when valid', () => {
      const result = validateExperienceRow(validRow, new Date('2024-01-01'));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.normalized.jobTitle).toBe('Math Teacher');
      }
    });

    it('requires job title', () => {
      const result = validateExperienceRow({ ...validRow, jobTitle: '  ' });
      expect(result).toEqual({ ok: false, fieldErrors: { jobTitle: 'Required' } });
    });

    it('skips employer fields for self-employed', () => {
      const result = validateExperienceRow(
        {
          ...validRow,
          employmentType: EmploymentType.SELF_EMPLOYED,
          employerName: '',
          employerAddress: '',
        },
        new Date('2024-01-01'),
      );
      expect(result.ok).toBe(true);
    });

    it('requires end date when not current', () => {
      const result = validateExperienceRow({ ...validRow, endDate: '', isCurrent: false });
      expect(result).toEqual({
        ok: false,
        fieldErrors: { endDate: 'Required when not currently working' },
      });
    });
  });

  describe('buildExperienceMutationInput', () => {
    it('omits employer fields for self-employed', () => {
      const input = buildExperienceMutationInput([
        {
          jobTitle: 'Tutor',
          employerName: 'ignored',
          employerAddress: 'ignored',
          employmentType: EmploymentType.SELF_EMPLOYED,
          startDate: '2021-01-01',
          endDate: '',
          isCurrent: true,
        },
      ]);
      expect(input[0]).toEqual({
        id: undefined,
        jobTitle: 'Tutor',
        employerName: undefined,
        employerAddress: undefined,
        employmentType: EmploymentType.SELF_EMPLOYED,
        startDate: '2021-01-01',
        endDate: undefined,
        isCurrent: true,
      });
    });
  });

  describe('mapExperienceToFormRow', () => {
    it('maps API experience to form row', () => {
      expect(
        mapExperienceToFormRow({
          id: 5,
          jobTitle: 'Teacher',
          employerName: 'School',
          employerAddress: 'Addr',
          employmentType: 1,
          startDate: '2020-03-15T00:00:00.000Z',
          endDate: '2021-04-01T00:00:00.000Z',
          isCurrent: false,
        }),
      ).toMatchObject({
        id: 5,
        jobTitle: 'Teacher',
        startDate: '2020-03-15',
        endDate: '2021-04-01',
        employmentType: EmploymentType.FULL_TIME,
      });
    });
  });

  describe('normalizeYearsOfExperience', () => {
    it('maps numeric values', () => {
      expect(normalizeYearsOfExperience(2)).toBe(YearsOfExperienceEnum.TWO_TO_FIVE);
    });

    it('passes through enum strings', () => {
      expect(normalizeYearsOfExperience('FIVE_TO_TEN')).toBe(
        YearsOfExperienceEnum.FIVE_TO_TEN,
      );
    });
  });
});
