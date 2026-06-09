import { gql } from '@apollo/client';

export const REQUEST_PROFILE_PICTURE_UPLOAD_URL = gql`
  mutation RequestProfilePictureUploadUrl($input: RequestProfilePictureUploadUrlInput!) {
    requestProfilePictureUploadUrl(input: $input) {
      uploadUrl
      storageKey
      expiresInSeconds
      contentType
    }
  }
`;

export const CONFIRM_PROFILE_PICTURE_UPLOAD = gql`
  mutation ConfirmProfilePictureUpload($input: ConfirmProfilePictureUploadInput!) {
    confirmProfilePictureUpload(input: $input) {
      id
      profilePicture
      profilePictureThumbnailMedium
      profilePictureThumbnailLarge
      profilePictureOriginalUrl
    }
  }
`;
