import type { OnboardingDocType, PickedFile } from './document-upload.types';
import { validatePickedFile } from './document-upload.utils';

/**
 * Structural mutation callbacks — avoid Apollo MutationFunctionOptions, which
 * fail assignability against useMutation under dual @apollo/client installs
 * (update/OperationVariables contravariance).
 */
type RequestUploadUrlMutation = (options: {
  variables: {
    input: {
      documentType: OnboardingDocType;
      mimeType: string;
      byteSize: number;
      originalFilename: string;
    };
  };
}) => Promise<{
  data?: {
    requestTutorDocumentUploadUrl?: {
      uploadUrl?: string | null;
      storageKey?: string | null;
      contentType?: string | null;
    } | null;
  } | null;
}>;

type ConfirmUploadMutation = (options: {
  variables: {
    input: {
      documentType: OnboardingDocType;
      storageKey: string;
      mimeType: string;
      sizeBytes: number;
      originalFilename: string;
    };
  };
}) => Promise<{ data?: { confirmTutorDocumentUpload?: unknown } | null }>;

export async function uploadTutorDocument(
  slot: OnboardingDocType,
  file: PickedFile,
  requestUploadUrl: RequestUploadUrlMutation,
  confirmUpload: ConfirmUploadMutation,
): Promise<void> {
  const validation = validatePickedFile(file.name, file.size, file.type);
  if (validation.ok === false) {
    throw new Error(validation.error);
  }

  const { mimeType } = validation;

  const { data: urlData } = await requestUploadUrl({
    variables: {
      input: {
        documentType: slot,
        mimeType,
        byteSize: file.size,
        originalFilename: file.name,
      },
    },
  });

  const payload = urlData?.requestTutorDocumentUploadUrl;
  if (!payload?.uploadUrl || !payload.storageKey || !payload.contentType) {
    throw new Error('Could not start upload. Please try again.');
  }

  const fileResponse = await fetch(file.uri);
  const blob = await fileResponse.blob();

  const putRes = await fetch(payload.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': payload.contentType,
    },
    body: blob,
  });

  if (!putRes.ok) {
    throw new Error(
      `Upload failed (${putRes.status}). Check your connection and try again.`,
    );
  }

  await confirmUpload({
    variables: {
      input: {
        documentType: slot,
        storageKey: payload.storageKey,
        mimeType,
        sizeBytes: file.size,
        originalFilename: file.name,
      },
    },
  });
}
