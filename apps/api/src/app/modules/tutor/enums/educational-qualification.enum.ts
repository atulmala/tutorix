import { registerEnumType } from '@nestjs/graphql';

/**
 * Educational qualification enum.
 * Values must match libs/shared-utils education-qualification.enum.ts (for GraphQL/frontend).
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
