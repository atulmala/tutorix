export type PickedProfileImage = {
  uri: string;
  name: string;
  size: number;
  type: string;
};

/**
 * Structural mutation callbacks — avoid Apollo MutationFunctionOptions, which
 * fail assignability against useMutation under dual @apollo/client installs
 * (update/OperationVariables contravariance).
 */
type RequestUploadUrlMutation = (options: {
  variables: { input: { mimeType: string; byteSize: number } };
}) => Promise<{
  data?: {
    requestProfilePictureUploadUrl?: {
      uploadUrl?: string | null;
      storageKey?: string | null;
      contentType?: string | null;
    } | null;
  } | null;
}>;

type ConfirmUploadMutation = (options: {
  variables: {
    input: {
      storageKey: string;
      mimeType: string;
      sizeBytes: number;
    };
  };
}) => Promise<{ data?: { confirmProfilePictureUpload?: unknown } | null }>;

export function validateProfileImage(file: PickedProfileImage): string | null {
  if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
    return 'Please choose a JPEG or PNG image';
  }
  if (file.size > 5 * 1024 * 1024) {
    return 'Image must be 5 MB or smaller';
  }
  return null;
}

export async function uploadProfilePicture(
  file: PickedProfileImage,
  requestUploadUrl: RequestUploadUrlMutation,
  confirmUpload: ConfirmUploadMutation,
): Promise<void> {
  const validationError = validateProfileImage(file);
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

  const fileResponse = await fetch(file.uri);
  const blob = await fileResponse.blob();

  const putRes = await fetch(payload.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': payload.contentType },
    body: blob,
  });

  if (!putRes.ok) {
    throw new Error('Upload to storage failed');
  }

  await confirmUpload({
    variables: {
      input: {
        storageKey: payload.storageKey,
        mimeType,
        sizeBytes: file.size,
      },
    },
  });
}
