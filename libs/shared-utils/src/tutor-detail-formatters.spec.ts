import {
  formatExperiencePeriod,
  formatQualificationGrade,
  formatQualificationInstitutionGrade,
  sortExperiencesLatestFirst,
  sortQualificationsHighestFirst,
  STUDENT_TUTOR_RECENT_EXPERIENCE_LIMIT,
  STUDENT_TUTOR_TOP_QUALIFICATION_LIMIT,
  sumExperienceDurations,
} from './tutor-detail-formatters';

describe('tutor student profile helpers', () => {
  it('sums employment date ranges into years and months', () => {
    const total = sumExperienceDurations(
      [
        { startDate: '2020-01-01', endDate: '2022-01-01', isCurrent: false },
        { startDate: '2024-01-01', endDate: '2024-07-01', isCurrent: false },
      ],
      new Date('2026-01-01'),
    );
    expect(total).toEqual({ years: 2, months: 6 });
  });

  it('sorts current and latest employments first', () => {
    const sorted = sortExperiencesLatestFirst([
      { startDate: '2018-01-01', endDate: '2019-01-01', isCurrent: false },
      { startDate: '2021-01-01', endDate: '2023-06-01', isCurrent: false },
      { startDate: '2024-02-01', isCurrent: true },
    ]);
    expect(sorted[0]?.startDate).toBe('2024-02-01');
    expect(sorted[1]?.endDate).toBe('2023-06-01');
    expect(sorted.slice(0, STUDENT_TUTOR_RECENT_EXPERIENCE_LIMIT)).toHaveLength(3);
  });

  it('formats an employment period and qualification grade', () => {
    expect(
      formatExperiencePeriod({
        startDate: '2020-01-15',
        endDate: '2022-03-01',
        isCurrent: false,
      }),
    ).toMatch(/2020/);
    expect(
      formatExperiencePeriod({ startDate: '2024-02-01', isCurrent: true }),
    ).toContain('Present');
    expect(formatQualificationGrade('PERCENTAGE', '85')).toBe('85%');
    expect(formatQualificationGrade('CGPA', '8.5')).toBe('CGPA: 8.5');
    expect(formatQualificationGrade('DIVISION', 'I')).toBe('Division: I');
    expect(formatQualificationInstitutionGrade('JNU', 'PERCENTAGE', '72')).toBe('JNU · 72%');
    expect(formatQualificationInstitutionGrade('Delhi University', 'CGPA', '8.2')).toBe(
      'Delhi University · CGPA: 8.2',
    );
  });

  it('keeps the top two qualifications by level', () => {
    const top = sortQualificationsHighestFirst([
      { qualificationType: 'HIGHER_SECONDARY', yearObtained: 2014 },
      { qualificationType: 'BACHELORS', yearObtained: 2018 },
      { qualificationType: 'MASTERS', yearObtained: 2020 },
    ]).slice(0, STUDENT_TUTOR_TOP_QUALIFICATION_LIMIT);
    expect(top.map((q) => q.qualificationType)).toEqual(['MASTERS', 'BACHELORS']);
  });
});
