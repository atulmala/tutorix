/**
 * Employment type enum.
 * Shared by web and mobile for tutor onboarding (experience step).
 * String values match GraphQL enum member names; API maps to numeric.
 */
export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  SELF_EMPLOYED = 'SELF_EMPLOYED',
  FREELANCE = 'FREELANCE',
  INTERNSHIP = 'INTERNSHIP',
  TRAINEE = 'TRAINEE',
}

/** All values in display order (for dropdowns) */
export const EMPLOYMENT_TYPE_LIST: EmploymentType[] = [
  EmploymentType.FULL_TIME,
  EmploymentType.PART_TIME,
  EmploymentType.SELF_EMPLOYED,
  EmploymentType.FREELANCE,
  EmploymentType.INTERNSHIP,
  EmploymentType.TRAINEE,
];

/** Human-readable labels for UI */
export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  [EmploymentType.FULL_TIME]: 'Full-time',
  [EmploymentType.PART_TIME]: 'Part-time',
  [EmploymentType.SELF_EMPLOYED]: 'Self-employed',
  [EmploymentType.FREELANCE]: 'Freelance',
  [EmploymentType.INTERNSHIP]: 'Internship',
  [EmploymentType.TRAINEE]: 'Trainee',
};
