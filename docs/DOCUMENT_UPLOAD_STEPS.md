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

## S3 bucket CORS (required for browser uploads)

The web app uploads **directly to S3** with a presigned PUT URL. The API CORS settings do **not** apply to S3 — the **bucket** must allow your site origin.

Without this, the browser shows:

`blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource`

**Important:** CORS must be on the **same bucket** the API uses in **`S3_DOCUMENTS_BUCKET`**. If the API presigns URLs for `tutorix-documents-dev`, CORS on a different bucket (e.g. `tutorix-documents`) has no effect.

Verify with:

```bash
curl -i -X OPTIONS \
  -H "Origin: https://dev.tutorix.tech" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: content-type" \
  "https://YOUR-BUCKET.s3.us-east-2.amazonaws.com/"
```

Expect **200** and `Access-Control-Allow-Origin: https://dev.tutorix.tech`. A **403** with `CORSResponse: Bucket not found` means wrong bucket name or CORS not configured on that bucket.

In **AWS Console** → **S3** → your bucket (e.g. `tutorix-documents-dev`) → **Permissions** → **Cross-origin resource sharing (CORS)** → **Edit**:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": [
      "https://dev.tutorix.tech",
      "http://localhost:4200"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Add every frontend origin that uploads documents (`FRONTEND_URL`, staging URLs, etc.). Save and retry upload — no API redeploy needed.

The browser sends `PUT` with `Content-Type` and `Content-Length`; S3 responds to an `OPTIONS` preflight first, which must return `Access-Control-Allow-Origin`.

## Implemented (GraphQL + presigned S3)

- **`requestTutorDocumentUploadUrl`** – returns presigned PUT URL + `storageKey` (tutor must be on `docs` certification stage).
- **`confirmTutorDocumentUpload`** – verifies object with `HeadObject`, upserts `DocumentEntity`.
- **`myTutorProfile { documents { ... } }`** – lists tutor documents.

Allowed types: Aadhaar, PAN, Class XII marksheet, highest degree. MIME: PDF, JPEG, PNG. Max size: 10 MB.

## Later

- Thumbnails, admin download URLs, virus scanning.
- List/delete document mutations and queries.
