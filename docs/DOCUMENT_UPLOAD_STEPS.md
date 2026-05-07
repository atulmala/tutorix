# Document upload – incremental steps

Small steps to get from “bucket only” to full document upload.

## Done

1. **Document entities & enums** – `DocumentEntity`, `DocumentTypeEnum`, `DocumentForTypeEnum` (no separate attachment).
2. **AWS** – S3 bucket + IAM user via Terraform (`tutorix-documents-dev`).
3. **DB** – `document` table exists.
4. **Document module shell** – `DocumentModule` + `DocumentService` (repo only), registered in `AppModule`.

## Environment (backend)

- **`AWS_REGION`** (or `AWS_DEFAULT_REGION`) – S3 bucket region.
- **`S3_DOCUMENTS_BUCKET`** – bucket name (e.g. Terraform `tutorix-documents-dev`).
- AWS credentials via default SDK chain (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`, or IAM role).

## Implemented (GraphQL + presigned S3)

- **`requestTutorDocumentUploadUrl`** – returns presigned PUT URL + `storageKey` (tutor must be on `docs` certification stage).
- **`confirmTutorDocumentUpload`** – verifies object with `HeadObject`, upserts `DocumentEntity`.
- **`myTutorProfile { documents { ... } }`** – lists tutor documents.

Allowed types: Aadhaar, PAN, Class XII marksheet, highest degree. MIME: PDF, JPEG, PNG. Max size: 10 MB.

## Later

- Thumbnails, admin download URLs, virus scanning.
- List/delete document mutations and queries.
