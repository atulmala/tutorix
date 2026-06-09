import { UserRole } from './enums/user-role.enum';

export function profilePictureRoleSegment(role: UserRole | string): 'tutor' | 'student' {
  const normalized = String(role).toUpperCase();
  return normalized === UserRole.TUTOR ? 'tutor' : 'student';
}

export function buildProfilePictureStorageKey(
  role: UserRole | string,
  userId: number,
  ext: string,
): string {
  const segment = profilePictureRoleSegment(role);
  return `profile_pic/${segment}/${userId}/profile_pic.${ext}`;
}

export function profilePictureThumbnailKeys(storageKey: string): string[] {
  const dot = storageKey.lastIndexOf('.');
  const basePath = dot > 0 ? storageKey.slice(0, dot) : storageKey;
  return [
    `${basePath}_thumb_sm.webp`,
    `${basePath}_thumb_md.webp`,
    `${basePath}_thumb_lg.webp`,
  ];
}

export function validateProfilePictureStorageKey(
  role: UserRole | string,
  userId: number,
  storageKey: string,
): void {
  const prefix = `profile_pic/${profilePictureRoleSegment(role)}/${userId}/profile_pic.`;
  if (!storageKey.startsWith(prefix) || storageKey.length <= prefix.length) {
    throw new Error('Invalid storage key for profile picture');
  }
  const ext = storageKey.slice(prefix.length);
  if (!/^(jpg|jpeg|png)$/.test(ext)) {
    throw new Error('Invalid profile picture file extension');
  }
}
