jest.mock('pdf-to-img', () => ({
  pdf: jest.fn(),
}));

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const { pdf } = jest.requireMock<{ pdf: jest.Mock }>('pdf-to-img');

import {
  buildPdfFirstPageBuffer,
  buildTutorDocumentImageMediaPatch,
} from './document-image-media';

/** Minimal 1×1 PNG */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('document-image-media', () => {
  describe('buildPdfFirstPageBuffer', () => {
    it('returns first page buffer from pdf-to-img', async () => {
      const pageBytes = new Uint8Array([1, 2, 3]);
      pdf.mockResolvedValue({
        async *[Symbol.asyncIterator]() {
          yield pageBytes;
        },
      });

      const result = await buildPdfFirstPageBuffer(Buffer.from('%PDF'));
      expect(result).toEqual(Buffer.from(pageBytes));
    });

    it('returns null when pdf-to-img fails', async () => {
      pdf.mockRejectedValue(new Error('invalid pdf'));
      expect(await buildPdfFirstPageBuffer(Buffer.from('bad'))).toBeNull();
    });
  });

  describe('buildTutorDocumentImageMediaPatch', () => {
    let s3Send: jest.Mock;

    beforeEach(() => {
      s3Send = jest.fn().mockResolvedValue({});
    });

    it('uploads thumbnails for JPEG and sets thumbnailSmall key', async () => {
      const s3 = { send: s3Send } as unknown as S3Client;
      const patch = await buildTutorDocumentImageMediaPatch({
        s3,
        bucket: 'docs-bucket',
        storageKey: 'tutors/1/onboarding/PAN_CARD/doc.jpg',
        mimeTypeHeader: 'image/jpeg',
        body: TINY_PNG,
      });

      expect(patch).not.toBeNull();
      expect(patch?.thumbnailSmall).toBe(
        'tutors/1/onboarding/PAN_CARD/doc_thumb_sm.webp',
      );
      expect(patch?.thumbnailMedium).toContain('_thumb_md.webp');
      expect(patch?.thumbnailLarge).toContain('_thumb_lg.webp');
      expect(s3Send).toHaveBeenCalledTimes(3);
      expect(s3Send.mock.calls[0][0]).toBeInstanceOf(PutObjectCommand);
    });

    it('rasterizes PDF first page then uploads thumbnails', async () => {
      pdf.mockResolvedValue({
        async *[Symbol.asyncIterator]() {
          yield TINY_PNG;
        },
      });

      const s3 = { send: s3Send } as unknown as S3Client;
      const patch = await buildTutorDocumentImageMediaPatch({
        s3,
        bucket: 'docs-bucket',
        storageKey: 'tutors/1/onboarding/PAN_CARD/doc.pdf',
        mimeTypeHeader: 'application/pdf',
        body: Buffer.from('%PDF-1.4'),
      });

      expect(pdf).toHaveBeenCalled();
      expect(patch?.thumbnailSmall).toBe(
        'tutors/1/onboarding/PAN_CARD/doc_thumb_sm.webp',
      );
      expect(s3Send).toHaveBeenCalledTimes(3);
    });

    it('uses CDN URLs when publicBaseUrl is set', async () => {
      const s3 = { send: s3Send } as unknown as S3Client;
      const patch = await buildTutorDocumentImageMediaPatch({
        s3,
        bucket: 'docs-bucket',
        storageKey: 'tutors/1/onboarding/PAN_CARD/doc.jpg',
        mimeTypeHeader: 'image/jpeg',
        body: TINY_PNG,
        publicBaseUrl: 'https://cdn.example.com',
      });

      expect(patch?.thumbnailSmall).toBe(
        'https://cdn.example.com/tutors/1/onboarding/PAN_CARD/doc_thumb_sm.webp',
      );
    });
  });
});
