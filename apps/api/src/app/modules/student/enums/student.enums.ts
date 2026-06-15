import { registerEnumType } from '@nestjs/graphql';

export enum StudentOnboardingStageEnum {
  parent = 'parent',
  address = 'address',
  education = 'education',
  registrationPayment = 'registrationPayment',
}

export enum ParentRelationEnum {
  FATHER = 'FATHER',
  MOTHER = 'MOTHER',
}

export enum StudentTypeEnum {
  SCHOOL = 'SCHOOL',
  COLLEGE = 'COLLEGE',
  NOT_STUDYING = 'NOT_STUDYING',
  COMPLETED = 'COMPLETED',
}

export enum SchoolBoardEnum {
  CBSE = 'CBSE',
  ICSE = 'ICSE',
  IB = 'IB',
  OTHER = 'OTHER',
}

registerEnumType(StudentOnboardingStageEnum, {
  name: 'StudentOnboardingStageEnum',
});

registerEnumType(ParentRelationEnum, {
  name: 'ParentRelationEnum',
});

registerEnumType(StudentTypeEnum, {
  name: 'StudentTypeEnum',
});

registerEnumType(SchoolBoardEnum, {
  name: 'SchoolBoardEnum',
});
