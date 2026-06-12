import {
  initialsFromProfileName,
  profilePictureAvatarUrl,
} from './profile-picture';

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

describe('initialsFromProfileName', () => {
  it('returns uppercase initials from first and last name', () => {
    expect(initialsFromProfileName('Luke', 'Harper')).toBe('LH');
  });

  it('returns ? when no name parts', () => {
    expect(initialsFromProfileName('', '')).toBe('?');
  });
});
