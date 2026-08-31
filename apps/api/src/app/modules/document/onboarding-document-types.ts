import { DocumentTypeEnum } from './enums/document-type.enum';

export const ONBOARDING_DOCUMENT_TYPES: DocumentTypeEnum[] = [
  DocumentTypeEnum.AADHAAR_CARD,
  DocumentTypeEnum.PAN_CARD,
  DocumentTypeEnum.CLASS_XII_MARKSHEET,
  DocumentTypeEnum.HIGHEST_DEGREE_CERTIFICATE,
];

export const ONBOARDING_DOCUMENT_DISPLAY_NAMES: Partial<
  Record<DocumentTypeEnum, string>
> = {
  [DocumentTypeEnum.AADHAAR_CARD]: 'Aadhaar Card',
  [DocumentTypeEnum.PAN_CARD]: 'PAN Card',
  [DocumentTypeEnum.CLASS_XII_MARKSHEET]: 'Class XII Marksheet',
  [DocumentTypeEnum.HIGHEST_DEGREE_CERTIFICATE]: 'Highest Degree Certificate',
};
