import {
  resolveDocumentPreviewPublicUrl,
  resolveDocumentPreviewS3Key,
} from './document-preview.helpers';

describe('document-preview.helpers', () => {
  describe('resolveDocumentPreviewPublicUrl', () => {
    it('returns HTTPS thumbnail when set', () => {
      expect(
        resolveDocumentPreviewPublicUrl({
          thumbnailSmall: 'https://cdn.example.com/tutors/1/thumb.webp',
        }),
      ).toBe('https://cdn.example.com/tutors/1/thumb.webp');
    });

    it('returns null when only S3 keys are stored', () => {
      expect(
        resolveDocumentPreviewPublicUrl({
          thumbnailSmall: 'tutors/1/onboarding/PAN_CARD/x_thumb_sm.webp',
        }),
      ).toBeNull();
    });
  });

  describe('resolveDocumentPreviewS3Key', () => {
    it('returns thumbnail key when not a public URL', () => {
      expect(
        resolveDocumentPreviewS3Key({
          thumbnailSmall: 'tutors/1/onboarding/PAN_CARD/x_thumb_sm.webp',
          storageKey: 'tutors/1/onboarding/PAN_CARD/x.pdf',
          mimeType: 'application/pdf',
        }),
      ).toBe('tutors/1/onboarding/PAN_CARD/x_thumb_sm.webp');
    });

    it('falls back to storage key for raster images without thumb', () => {
      expect(
        resolveDocumentPreviewS3Key({
          thumbnailSmall: null,
          storageKey: 'tutors/1/onboarding/PAN_CARD/x.jpg',
          mimeType: 'image/jpeg',
        }),
      ).toBe('tutors/1/onboarding/PAN_CARD/x.jpg');
    });

    it('returns null when public URL is available', () => {
      expect(
        resolveDocumentPreviewS3Key({
          thumbnailSmall: 'https://cdn.example.com/thumb.webp',
          storageKey: 'tutors/1/x.jpg',
          mimeType: 'image/jpeg',
        }),
      ).toBeNull();
    });
  });
});
