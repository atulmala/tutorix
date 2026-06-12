import type { ProfilePictureFields } from '../types/web-user';

export type ProfilePictureUploadResult = ProfilePictureFields & {
  id: number;
};

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

export function initialsFromName(first?: string | null, last?: string | null): string {
  const f = first?.trim()?.[0] ?? '';
  const l = last?.trim()?.[0] ?? '';
  return (f + l).toUpperCase() || '?';
}

export function profilePictureAvatarUrl(user?: ProfilePictureFields | null): string | null {
  if (!user) return null;
  const candidate = user.profilePicture ?? user.profilePictureThumbnailMedium ?? null;
  if (!candidate) return null;
  if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
    return candidate;
  }
  return null;
}

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
