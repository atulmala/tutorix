import { formatSchoolClassRoman, SCHOOL_CLASS_OPTIONS } from './school-class';

describe('school-class', () => {
  it('maps classes 1-12 to Roman numerals', () => {
    expect(formatSchoolClassRoman(1)).toBe('I');
    expect(formatSchoolClassRoman(4)).toBe('IV');
    expect(formatSchoolClassRoman(9)).toBe('IX');
    expect(formatSchoolClassRoman(11)).toBe('XI');
    expect(formatSchoolClassRoman(12)).toBe('XII');
  });

  it('exposes 12 class options', () => {
    expect(SCHOOL_CLASS_OPTIONS).toHaveLength(12);
    expect(SCHOOL_CLASS_OPTIONS[11]).toEqual({ value: 12, label: 'XII' });
  });
});
