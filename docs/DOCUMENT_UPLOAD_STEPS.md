# Document upload – incremental steps

Small steps to get from “bucket only” to full document upload.

## Done

1. **Document entities & enums** – `DocumentEntity`, `DocumentTypeEnum`, `DocumentForTypeEnum` (no separate attachment).
2. **AWS** – S3 bucket + IAM user via Terraform (`tutorix-documents-dev`).
3. **DB** – `document` table exists.
4. **Document module shell** – `DocumentModule` + `DocumentService` (repo only), registered in `AppModule`.

## Next steps (in order)

### Step C: S3 config + upload service
- Add config for `AWS_REGION`, `S3_DOCUMENTS_BUCKET` (or reuse existing .env keys).
- Install `@aws-sdk/client-s3`.
- Add `DocumentService` with e.g. `uploadBuffer(key, buffer, contentType)` that puts to S3 and returns the key. Optional: `getSignedUrl(key)` for download.
- No GraphQL yet.

### Step D: GraphQL + persist
- DTOs for upload input (tutorId, documentType, file metadata).
- Resolver mutation e.g. `uploadDocument(file, tutorId, documentType)` that:
  - uploads file to S3 via `DocumentService`,
  - creates a `DocumentEntity` with `storageKey`, `filename`, `mimeType`, `size`, etc.
- Wire file upload (e.g. `graphql-upload` or multipart in Nest).

### Step E (later)
- Presigned URLs for client-side upload if needed.
- Thumbnails, image dimensions, etc.
- List/delete document mutations and queries.
