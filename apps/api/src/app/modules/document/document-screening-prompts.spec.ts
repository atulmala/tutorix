import {
  buildDynamicScreeningUserText,
  DOCUMENT_SCREENING_STATIC_SYSTEM,
} from './document-screening-prompts';
import { DocumentTypeEnum } from './enums/document-type.enum';

describe('document-screening-prompts', () => {
  it('includes all onboarding slot rubrics in static system text', () => {
    expect(DOCUMENT_SCREENING_STATIC_SYSTEM).toContain('AADHAAR_CARD');
    expect(DOCUMENT_SCREENING_STATIC_SYSTEM).toContain('PAN_CARD');
    expect(DOCUMENT_SCREENING_STATIC_SYSTEM).toContain('CLASS_XII_MARKSHEET');
    expect(DOCUMENT_SCREENING_STATIC_SYSTEM).toContain('HIGHEST_DEGREE_CERTIFICATE');
    expect(DOCUMENT_SCREENING_STATIC_SYSTEM).toContain('"accept"');
    expect(DOCUMENT_SCREENING_STATIC_SYSTEM).toContain('"nameMatch"');
  });

  it('builds dynamic user text with slot and tutor name', () => {
    const text = buildDynamicScreeningUserText(
      DocumentTypeEnum.PAN_CARD,
      'Atul Mala',
    );
    expect(text).toContain('PAN_CARD');
    expect(text).toContain('Atul Mala');
    expect(text).not.toContain('Income Tax Department');
  });

  it('static system text is long enough for Sonnet prompt caching minimum', () => {
    // Anthropic requires ~1024 tokens; ~4 chars/token is a conservative estimate.
    expect(DOCUMENT_SCREENING_STATIC_SYSTEM.length).toBeGreaterThanOrEqual(4096);
  });

  it('allows partially masked Aadhaar numbers on front layout', () => {
    expect(DOCUMENT_SCREENING_STATIC_SYSTEM).toContain('XXXX-XXXX-XXXX');
    expect(DOCUMENT_SCREENING_STATIC_SYSTEM).toContain('first 4 digits OR the first 8 digits are masked');
    expect(DOCUMENT_SCREENING_STATIC_SYSTEM).toContain(
      'Do NOT reject solely because the Aadhaar number is partially masked',
    );
    expect(DOCUMENT_SCREENING_STATIC_SYSTEM).toContain(
      'Never output Aadhaar numbers, PAN strings',
    );
  });
});
