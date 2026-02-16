/**
 * Years of experience enum.
 * Shared by web and mobile for tutor onboarding (experience step).
 * String values match GraphQL enum member names; API maps to numeric.
 */
export enum YearsOfExperienceEnum {
  ZERO_TO_TWO = 'ZERO_TO_TWO',
  TWO_TO_FIVE = 'TWO_TO_FIVE',
  FIVE_TO_TEN = 'FIVE_TO_TEN',
  MORE_THAN_TEN = 'MORE_THAN_TEN',
}

/** All values in display order (for dropdowns) */
export const YEARS_OF_EXPERIENCE_LIST: YearsOfExperienceEnum[] = [
  YearsOfExperienceEnum.ZERO_TO_TWO,
  YearsOfExperienceEnum.TWO_TO_FIVE,
  YearsOfExperienceEnum.FIVE_TO_TEN,
  YearsOfExperienceEnum.MORE_THAN_TEN,
];

/** Human-readable labels for UI */
export const YEARS_OF_EXPERIENCE_LABELS: Record<YearsOfExperienceEnum, string> = {
  [YearsOfExperienceEnum.ZERO_TO_TWO]: '0 to 2 years',
  [YearsOfExperienceEnum.TWO_TO_FIVE]: '2 to 5 years',
  [YearsOfExperienceEnum.FIVE_TO_TEN]: '5 to 10 years',
  [YearsOfExperienceEnum.MORE_THAN_TEN]: 'More than 10 years',
};
