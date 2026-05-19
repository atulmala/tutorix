# tutor-document-metadata

Lambda handler for S3 `ObjectCreated` events: reads tutor onboarding **images**, writes three **WebP thumbnails**, and logs metadata aligned with `DocumentEntity`:

- `thumbnailSmall`, `thumbnailMedium`, `thumbnailLarge`
- `originalUrl`
- `averageColor`
- `width`, `height`

**Skips** keys ending with `_thumb_sm.webp`, `_thumb_md.webp`, `_thumb_lg.webp` to avoid recursive processing.

**Non-images (e.g. PDF):** No thumbnails; logged result has `skipped: true` and zero dimensions.

## Local run

```bash
cd lambdas/tutor-document-metadata
npm install
export AWS_REGION=<bucket-region>
node local-invoke.mjs --bucket <bucket> --key <object-key>
```

## Deploy packaging (Linux Sharp binary)

For AWS Lambda **Node.js 20 on x86_64**, reinstall Sharp for Linux before creating the deployment zip:

```bash
npm ci
npm run install:lambda-linux
zip -r function.zip . -x '*.git*' -x 'local-invoke.mjs' -x 'README.md'
```

Use **arm64** flags if your function runs on Graviton (`--cpu=arm64`).

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DOCUMENT_PUBLIC_BASE_URL` | Optional CDN/base URL for building `originalUrl` and thumbnail URLs |
| `AWS_REGION` / `AWS_DEFAULT_REGION` | S3 client region |

Persisting fields to Postgres is **not** done here; wire an API callback or batch job in a follow-up step.
