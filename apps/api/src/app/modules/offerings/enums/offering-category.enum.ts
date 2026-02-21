import { registerEnumType } from '@nestjs/graphql';

export enum OfferingCategoryEnum {
  SCHOOL_EDUCATION = 'SCHOOL_EDUCATION',
  COMPETITIVE_EXAM = 'COMPETITIVE_EXAM',
  LANGUAGE_LEARNING = 'LANGUAGE_LEARNING',
  STUDY_ABROAD = 'STUDY_ABROAD',
}

registerEnumType(OfferingCategoryEnum, {
  name: 'OfferingCategoryEnum',
  description: 'Category of what a tutor offers to teach',
});
