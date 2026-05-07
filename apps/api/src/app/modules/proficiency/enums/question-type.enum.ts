import { registerEnumType } from '@nestjs/graphql';

export enum QuestionTypeEnum {
  SINGLE_CHOICE = 1,
  MULTI_CHOICE,
}

registerEnumType(QuestionTypeEnum, {
  name: 'QuestionTypeEnum',
});

