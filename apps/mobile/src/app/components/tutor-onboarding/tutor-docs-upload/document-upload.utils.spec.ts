import {
  findSlotDoc,
  resolveMimeType,
  screeningPassed,
  validatePickedFile,
} from './document-upload.utils';

describe('document-upload.utils', () => {
  describe('resolveMimeType', () => {
    it('maps pdf extension when type is missing', () => {
      expect(resolveMimeType('marksheet.pdf', null)).toBe('application/pdf');
    });

    it('maps jpg extension', () => {
      expect(resolveMimeType('photo.JPG', '')).toBe('image/jpeg');
    });
  });

  describe('validatePickedFile', () => {
    it('rejects unsupported types', () => {
      const result = validatePickedFile('file.doc', 1000, null);
      expect(result).toEqual({
        ok: false,
        error: 'Please upload a PDF, JPG, or PNG file.',
      });
    });

    it('accepts valid pdf', () => {
      const result = validatePickedFile('id.pdf', 5000, 'application/pdf');
      expect(result).toEqual({ ok: true, mimeType: 'application/pdf' });
    });
  });

  describe('findSlotDoc', () => {
    it('finds document by type', () => {
      const docs = [
        { documentType: 'PAN_CARD', storageKey: 'k1' },
        { documentType: 'AADHAAR_CARD', storageKey: 'k2' },
      ];
      expect(findSlotDoc(docs, 'PAN_CARD')?.storageKey).toBe('k1');
    });
  });

  describe('screeningPassed', () => {
    it('returns true for PASSED_AUTOMATED', () => {
      expect(screeningPassed({ status: 'PASSED_AUTOMATED' })).toBe(true);
    });

    it('returns false when pending', () => {
      expect(screeningPassed({ status: 'PENDING_HUMAN' })).toBe(false);
    });
  });
});
