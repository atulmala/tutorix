import { registerEnumType } from '@nestjs/graphql';

/**
 * Grade type for educational qualifications.
 * Shared by web and mobile for tutor onboarding.
 */
export enum GradeType {
  CGPA = 'CGPA',
  PERCENTAGE = 'PERCENTAGE',
  DIVISION = 'DIVISION',
}

registerEnumType(GradeType, {
  name: 'GradeType',
  description: 'How the grade is expressed (CGPA, Percentage, or Division)',
});

/** All grade types in display order */
export const GRADE_TYPE_LIST: GradeType[] = [
  GradeType.CGPA,
  GradeType.PERCENTAGE,
  GradeType.DIVISION,
];

/** Human-readable labels for UI */
export const GRADE_TYPE_LABELS: Record<GradeType, string> = {
  [GradeType.CGPA]: 'CGPA',
  [GradeType.PERCENTAGE]: 'Percentage',
  [GradeType.DIVISION]: 'Division',
};
