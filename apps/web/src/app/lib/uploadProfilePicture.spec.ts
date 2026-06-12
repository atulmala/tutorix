import {
  initialsFromName,
  profilePictureAvatarUrl,
  validateProfilePictureFile,
} from './uploadProfilePicture';

describe('uploadProfilePicture', () => {
  describe('initialsFromName', () => {
    it('returns uppercase initials from first and last name', () => {
      expect(initialsFromName('Luke', 'Harper')).toBe('LH');
    });

    it('returns ? when no name parts', () => {
      expect(initialsFromName('', '')).toBe('?');
    });
  });

  describe('profilePictureAvatarUrl', () => {
    it('prefers profilePicture over thumbnail medium', () => {
      expect(
        profilePictureAvatarUrl({
          profilePicture: 'https://cdn/small.webp',
          profilePictureThumbnailMedium: 'https://cdn/md.webp',
        }),
      ).toBe('https://cdn/small.webp');
    });

    it('returns null for bare S3 keys (non-HTTP)', () => {
      expect(
        profilePictureAvatarUrl({
          profilePicture: 'profile_pic/tutor/1/profile_pic_thumb_sm.webp',
        }),
      ).toBeNull();
    });

    it('falls back to thumbnail medium', () => {
      expect(
        profilePictureAvatarUrl({
          profilePicture: null,
          profilePictureThumbnailMedium: 'https://cdn/md.webp',
        }),
      ).toBe('https://cdn/md.webp');
    });
  });

  describe('validateProfilePictureFile', () => {
    it('rejects non-image mime types', () => {
      const file = new File(['x'], 'a.gif', { type: 'image/gif' });
      expect(validateProfilePictureFile(file)).toBe('Please choose a JPEG or PNG image');
    });

    it('rejects files over 5 MB', () => {
      const file = new File([new ArrayBuffer(5 * 1024 * 1024 + 1)], 'big.png', {
        type: 'image/png',
      });
      expect(validateProfilePictureFile(file)).toBe('Image must be 5 MB or smaller');
    });

    it('accepts valid JPEG', () => {
      const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
      expect(validateProfilePictureFile(file)).toBeNull();
    });
  });
});
