import { registerEnumType } from '@nestjs/graphql';

export enum DocumentTypeEnum {
  OTHER = 1,
  PASSPORT,
  VOTER_ID,
  RATION_CARD,
  AADHAAR_CARD,
  PAN_CARD,
  DRIVING_LICENSE,
  UTILITY_BILL,
  ADDRESS_PROOF,
  GOVT_IDENTITY_CARD,
  GST_CERTIFICATE,
  TUTOR_NOTES,
  PROFILE_PIC,
}

registerEnumType(DocumentTypeEnum, {
  name: 'DocumentTypeEnum',
  description: 'Type of document (e.g. PAN, Aadhaar, educational certificate)',
});
