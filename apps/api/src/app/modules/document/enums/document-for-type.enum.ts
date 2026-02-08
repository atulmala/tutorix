import { registerEnumType } from '@nestjs/graphql';

export enum DocumentForTypeEnum {
  OTHER = 1,
  USER_PROFILE,
  TUTOR,
  STUDENT,
  INSTITUTE,
  CLASSES,
  INVOICES,
  PROFILE_PIC,
}

registerEnumType(DocumentForTypeEnum, {
  name: 'DocumentForTypeEnum',
  description: 'Entity or context this document belongs to',
});
