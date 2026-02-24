import { registerEnumType } from '@nestjs/graphql';

export enum TeachingLanguageEnum {
  ENGLISH = 1,
  HINDI = 2,
  OTHERS = 3,
}

registerEnumType(TeachingLanguageEnum, {
  name: 'TeachingLanguageEnum',
  description: 'Language in which the tutor will teach',
});
