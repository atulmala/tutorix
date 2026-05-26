import { imageAssetToPickedFile } from './document-image.utils';

describe('document-image.utils', () => {
  describe('imageAssetToPickedFile', () => {
    it('maps camera asset to PickedFile', () => {
      const file = imageAssetToPickedFile({
        uri: 'file:///photo.jpg',
        fileName: 'aadhaar.jpg',
        fileSize: 120000,
        type: 'image/jpeg',
      });
      expect(file).toEqual({
        uri: 'file:///photo.jpg',
        name: 'aadhaar.jpg',
        size: 120000,
        type: 'image/jpeg',
      });
    });

    it('defaults name and type when missing', () => {
      const file = imageAssetToPickedFile({
        uri: 'file:///photo.jpg',
      });
      expect(file.uri).toBe('file:///photo.jpg');
      expect(file.name).toMatch(/^document-\d+\.jpg$/);
      expect(file.type).toBe('image/jpeg');
      expect(file.size).toBe(0);
    });

    it('throws when uri is missing', () => {
      expect(() => imageAssetToPickedFile({})).toThrow('No photo was captured');
    });
  });
});
