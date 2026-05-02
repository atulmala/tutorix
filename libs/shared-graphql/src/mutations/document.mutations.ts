import { gql } from '@apollo/client';

/**
 * Presigned S3 PUT URL for tutor onboarding document (docs certification stage).
 */
export const REQUEST_TUTOR_DOCUMENT_UPLOAD_URL = gql`
  mutation RequestTutorDocumentUploadUrl($input: RequestTutorDocumentUploadUrlInput!) {
    requestTutorDocumentUploadUrl(input: $input) {
      uploadUrl
      storageKey
      expiresInSeconds
      contentType
    }
  }
`;

/**
 * Persist document metadata after successful upload to S3.
 */
export const CONFIRM_TUTOR_DOCUMENT_UPLOAD = gql`
  mutation ConfirmTutorDocumentUpload($input: ConfirmTutorDocumentUploadInput!) {
    confirmTutorDocumentUpload(input: $input) {
      id
      name
      documentType
      documentForType
      filename
      mimeType
      size
      storageKey
      verified
    }
  }
`;
