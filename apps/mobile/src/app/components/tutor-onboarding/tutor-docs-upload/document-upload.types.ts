export type OnboardingDocType =
  | 'AADHAAR_CARD'
  | 'PAN_CARD'
  | 'CLASS_XII_MARKSHEET'
  | 'HIGHEST_DEGREE_CERTIFICATE';

export type SlotDoc = {
  filename?: string | null;
  storageKey?: string | null;
  mimeType?: string | null;
  previewUrl?: string | null;
  verificationWorkflowStatus?: string | null;
  screening?: { status?: string | null; summaryNotes?: string | null } | null;
};

export type PickedFile = {
  uri: string;
  name: string;
  size: number;
  type?: string | null;
};

export const ONBOARDING_SLOTS: {
  documentType: OnboardingDocType;
  title: string;
  description: string;
}[] = [
  {
    documentType: 'AADHAAR_CARD',
    title: 'Aadhaar card',
    description: 'Front side (PDF, JPG, or PNG, max 10 MB).',
  },
  {
    documentType: 'PAN_CARD',
    title: 'PAN card',
    description: 'Income Tax PAN (PDF, JPG, or PNG, max 10 MB).',
  },
  {
    documentType: 'CLASS_XII_MARKSHEET',
    title: 'Higher secondary (Class XII)',
    description: 'Marksheet or certificate (PDF, JPG, or PNG, max 10 MB).',
  },
  {
    documentType: 'HIGHEST_DEGREE_CERTIFICATE',
    title: 'Highest degree',
    description: 'Degree certificate or transcript (PDF, JPG, or PNG, max 10 MB).',
  },
];
