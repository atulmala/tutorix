import { DocumentTypeEnum } from './enums/document-type.enum';

const ID_TYPES = new Set<DocumentTypeEnum>([
  DocumentTypeEnum.AADHAAR_CARD,
  DocumentTypeEnum.PAN_CARD,
]);

const EDUCATION_TYPES = new Set<DocumentTypeEnum>([
  DocumentTypeEnum.CLASS_XII_MARKSHEET,
  DocumentTypeEnum.HIGHEST_DEGREE_CERTIFICATE,
]);

export function isOnboardingIdDocument(dt: DocumentTypeEnum): boolean {
  return ID_TYPES.has(dt);
}

export function isOnboardingEducationDocument(dt: DocumentTypeEnum): boolean {
  return EDUCATION_TYPES.has(dt);
}
