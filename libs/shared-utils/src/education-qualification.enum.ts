import { registerEnumType } from '@nestjs/graphql';

/**
 * Educational qualification enum.
 * Shared by web and mobile for tutor onboarding (qualification step).
 */
export enum EducationalQualification {
  HIGHER_SECONDARY = 'HIGHER_SECONDARY',
  DIPLOMA = 'DIPLOMA',
  BACHELORS = 'BACHELORS',
  PG_DIPLOMA = 'PG_DIPLOMA',
  MASTERS = 'MASTERS',
  MPHIL = 'MPHIL',
  PHD = 'PHD',
}

registerEnumType(EducationalQualification, {
  name: 'EducationalQualification',
  description: 'Educational qualification levels for tutor onboarding',
});

/** All qualification values in display order (for dropdowns, etc.) */
export const EDUCATIONAL_QUALIFICATION_LIST: EducationalQualification[] = [
  EducationalQualification.HIGHER_SECONDARY,
  EducationalQualification.DIPLOMA,
  EducationalQualification.BACHELORS,
  EducationalQualification.PG_DIPLOMA,
  EducationalQualification.MASTERS,
  EducationalQualification.MPHIL,
  EducationalQualification.PHD,
];

/** Human-readable labels for UI (web and mobile) */
export const EDUCATIONAL_QUALIFICATION_LABELS: Record<
  EducationalQualification,
  string
> = {
  [EducationalQualification.HIGHER_SECONDARY]: 'Higher Secondary',
  [EducationalQualification.DIPLOMA]: 'Diploma',
  [EducationalQualification.BACHELORS]: 'Bachelors',
  [EducationalQualification.PG_DIPLOMA]: 'PG Diploma',
  [EducationalQualification.MASTERS]: 'Masters',
  [EducationalQualification.MPHIL]: 'MPhil',
  [EducationalQualification.PHD]: 'PhD',
};
