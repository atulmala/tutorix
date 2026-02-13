import { registerEnumType } from '@nestjs/graphql';

export enum EmploymentType {
  FULL_TIME = 1,
  PART_TIME,
  SELF_EMPLOYED,
  FREELANCE,
  INTERNSHIP,
  TRAINEE,
}

registerEnumType(EmploymentType, {
  name: 'EmploymentType',
  description: 'Type of employment for tutor experience',
});
