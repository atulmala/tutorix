import { registerEnumType } from '@nestjs/graphql';

export enum PlatformFeeCodeEnum {
  TUTOR_REGISTRATION = 'TUTOR_REGISTRATION',
  PROFICIENCY_TEST = 'PROFICIENCY_TEST',
  STUDENT_REGISTRATION = 'STUDENT_REGISTRATION',
}

registerEnumType(PlatformFeeCodeEnum, {
  name: 'PlatformFeeCode',
});
