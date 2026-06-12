export type ProfilePictureFields = {
  profilePicture?: string | null;
  profilePictureThumbnailMedium?: string | null;
  profilePictureThumbnailLarge?: string | null;
  profilePictureOriginalUrl?: string | null;
};

export type WebUser = {
  id: number;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
} & ProfilePictureFields;
