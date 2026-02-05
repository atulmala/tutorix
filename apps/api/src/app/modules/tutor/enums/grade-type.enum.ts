import { registerEnumType } from '@nestjs/graphql';

/**
 * Grade type for educational qualifications.
 * Values must match libs/shared-utils grade-type.enum.ts (for GraphQL/frontend).
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
