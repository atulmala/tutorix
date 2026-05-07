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
  /** Class XII / higher-secondary marksheet (tutor onboarding). */
  CLASS_XII_MARKSHEET = 14,
  /** Highest degree certificate or transcript (tutor onboarding). */
  HIGHEST_DEGREE_CERTIFICATE = 15,
}

registerEnumType(DocumentTypeEnum, {
  name: 'DocumentTypeEnum',
  description: 'Type of document (e.g. PAN, Aadhaar, educational certificate)',
});
