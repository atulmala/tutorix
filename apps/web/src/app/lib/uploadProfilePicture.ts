import {
  initialsFromProfileName,
  profilePictureAvatarUrl,
  type ProfilePictureFields,
} from '@tutorix/shared-utils';

export type ProfilePictureUploadResult = ProfilePictureFields & {
  id: number;
};

export { profilePictureAvatarUrl };

export function initialsFromName(first?: string | null, last?: string | null): string {
  return initialsFromProfileName(first, last);
}

type RequestUploadUrlFn = (options: {
  variables: { input: { mimeType: string; byteSize: number } };
}) => Promise<{
  data?: {
    requestProfilePictureUploadUrl?: {
      uploadUrl?: string;
      storageKey?: string;
      contentType?: string;
    };
  };
}>;

type ConfirmUploadFn = (options: {
  variables: {
    input: {
      storageKey: string;
      mimeType: string;
      sizeBytes: number;
    };
  };
}) => Promise<{
  data?: { confirmProfilePictureUpload?: ProfilePictureUploadResult };
}>;

export function validateProfilePictureFile(file: File): string | null {
  if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
    return 'Please choose a JPEG or PNG image';
  }
  if (file.size > 5 * 1024 * 1024) {
    return 'Image must be 5 MB or smaller';
  }
  return null;
}

export async function uploadProfilePictureFile(
  file: File,
  requestUploadUrl: RequestUploadUrlFn,
  confirmUpload: ConfirmUploadFn,
): Promise<ProfilePictureUploadResult> {
  const validationError = validateProfilePictureFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const mimeType = file.type;

  const { data: urlData } = await requestUploadUrl({
    variables: {
      input: { mimeType, byteSize: file.size },
    },
  });

  const payload = urlData?.requestProfilePictureUploadUrl;
  if (!payload?.uploadUrl || !payload.storageKey || !payload.contentType) {
    throw new Error('Could not get upload URL');
  }

  const putRes = await fetch(payload.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': payload.contentType },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error('Upload to storage failed');
  }

  const { data: confirmData } = await confirmUpload({
    variables: {
      input: {
        storageKey: payload.storageKey,
        mimeType,
        sizeBytes: file.size,
      },
    },
  });

  const updatedUser = confirmData?.confirmProfilePictureUpload;
  if (!updatedUser?.id) {
    throw new Error('Failed to confirm profile picture upload');
  }

  return updatedUser;
}
