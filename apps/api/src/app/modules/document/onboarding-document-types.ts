import { DocumentTypeEnum } from './enums/document-type.enum';

export const ONBOARDING_DOCUMENT_TYPES = [
  DocumentTypeEnum.AADHAAR_CARD,
  DocumentTypeEnum.PAN_CARD,
  DocumentTypeEnum.CLASS_XII_MARKSHEET,
  DocumentTypeEnum.HIGHEST_DEGREE_CERTIFICATE,
] as const;
