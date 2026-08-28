# AWS Secrets Manager Integration

The API loads shared secrets from one Secrets Manager JSON, `tutorix/app`, in `us-east-1`. Docker Compose sets `NODE_ENV=production` on staging as well, so Razorpay live vs test is controlled by **`TUTORIX_ENV`**, not `NODE_ENV`.

## What is stored (`tutorix/app`)

```json
{
  "DB_USERNAME": "...",
  "DB_PASSWORD": "...",
  "JWT_SECRET": "...",
  "ANTHROPIC_API_KEY": "...",
  "FIREBASE_SERVICE_ACCOUNT_JSON": "{...}",
  "RAZORPAY_KEY_ID": "rzp_live_...",
  "RAZORPAY_KEY_SECRET": "..."
}
```

Razorpay values in this secret are the **live** keys. They are applied only when `TUTORIX_ENV=production`.

## What stays in `.env` / Compose (per environment)

- `TUTORIX_ENV` — `development` | `staging` | `production`
- `AWS_SECRET_NAME=tutorix/app` and `AWS_REGION=us-east-1`
- `DB_HOST`, `DB_PORT`, `DB_NAME`
- `FRONTEND_URL`, `CORS_ORIGINS`, S3 bucket + `S3_DOCUMENTS_BUCKET_REGION`, SES
- **Staging/local only:** `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` test keys (`rzp_test_...`)
- **Local only:** `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`. EC2 uses instance role `TutorixEC2Role`

`TUTORIX_ENV=test` (Jest) does not call Secrets Manager.

## Loader behavior

[`apps/api/src/app/config/app-secrets.loader.ts`](../apps/api/src/app/config/app-secrets.loader.ts) runs at API startup (and before TypeORM CLI / `create:admin`):

1. Fetch `tutorix/app`.
2. Assign JSON keys onto `process.env`.
3. Never overwrite `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DB_HOST`, `DB_PORT`, `DB_NAME`.
4. Apply `RAZORPAY_*` from the secret **only** when `TUTORIX_ENV=production`.
5. Fail closed if the fetch fails or `DB_USERNAME` / `DB_PASSWORD` are missing.

## IAM

The API identity needs `secretsmanager:GetSecretValue` and `DescribeSecret` on:

`arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:tutorix/app-*`

`TutorixEC2Role` has `TutorixSecretsManagerRead`. Local IAM user `classup` has `TutorixSecretsManagerWrite`.

## Related

- [SECURITY.md](../SECURITY.md)
- [MIGRATIONS_GUIDE.md](./MIGRATIONS_GUIDE.md)
