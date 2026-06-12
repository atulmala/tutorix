export type ProfilePictureFields = {
  profilePicture?: string | null;
  profilePictureThumbnailMedium?: string | null;
};

/** Pick the best HTTPS URL for a circular avatar from resolved profile picture fields. */
export function profilePictureAvatarUrl(
  user?: ProfilePictureFields | null,
): string | null {
  if (!user) return null;
  const candidate = user.profilePicture ?? user.profilePictureThumbnailMedium ?? null;
  if (!candidate) return null;
  if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
    return candidate;
  }
  return null;
}

export function initialsFromProfileName(
  first?: string | null,
  last?: string | null,
): string {
  const f = first?.trim()?.[0] ?? '';
  const l = last?.trim()?.[0] ?? '';
  return (f + l).toUpperCase() || '?';
}
