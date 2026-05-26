import type { FetchResult, MutationFunctionOptions } from '@apollo/client';
import type { OnboardingDocType, PickedFile } from './document-upload.types';
import { validatePickedFile } from './document-upload.utils';

type RequestUploadUrlMutation = (
  options?: MutationFunctionOptions<
    {
      requestTutorDocumentUploadUrl?: {
        uploadUrl?: string;
        storageKey?: string;
        contentType?: string;
      };
    },
    { input: Record<string, unknown> }
  >,
) => Promise<FetchResult>;

type ConfirmUploadMutation = (
  options?: MutationFunctionOptions<
    { confirmTutorDocumentUpload?: unknown },
    { input: Record<string, unknown> }
  >,
) => Promise<FetchResult>;

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
