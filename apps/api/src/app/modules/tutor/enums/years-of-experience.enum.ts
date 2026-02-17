import { registerEnumType } from '@nestjs/graphql';

export enum YearsOfExperienceEnum {
  ZERO_TO_TWO = 1,
  TWO_TO_FIVE,
  FIVE_TO_TEN,
  MORE_THAN_TEN,
}

registerEnumType(YearsOfExperienceEnum, {
  name: 'YearsOfExperienceEnum',
  description: 'Years of teaching/work experience: 0-2, 2-5, 5-10, or more than 10 years',
});
