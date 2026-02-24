import { registerEnumType } from '@nestjs/graphql';

export enum QuestionDifficultyEnum {
  LOW = 1,
  MEDIUM,
  HIGH,
}

registerEnumType(QuestionDifficultyEnum, {
  name: 'QuestionDifficultyEnum',
});

