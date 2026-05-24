# Deploy Tutorix on EC2 with Docker

This repository ships **`docker-compose.yml`** plus **`docker/Dockerfile.api`**, **`docker/Dockerfile.web`**, and **`docker/Dockerfile.admin`** to run **NestJS GraphQL API**, **tutor web UI**, and **admin web UI** on a single EC2 host.

## What runs

| Service   | Role |
|-----------|------|
| `api`      | NestJS bundle listening on port **3000** inside the Compose network only |
| `web`      | nginx serves tutor SPA (`apps/web`) on **127.0.0.1:8080**, proxies **`/api/`** → `api` |
| `admin`    | nginx serves admin SPA (`apps/web-admin`) on **127.0.0.1:81**, proxies **`/api/`** → `api` |

Public HTTPS is handled by **host nginx** on the EC2 instance (see [Two subdomains — host reverse proxy](#two-subdomains--host-reverse-proxy-approach-b)).

GraphQL from the browser: **`https://<your-host>/api/graphql`** (same-origin when using **`VITE_GRAPHQL_ENDPOINT=/api/graphql`**).

## Two subdomains — host reverse proxy (Approach B)

Use this when **`dev.tutorix.tech`** and **`dev-admin.tutorix.tech`** both point to the same EC2 IP.

| Hostname | DNS | Host nginx → | Compose service |
|----------|-----|--------------|-----------------|
| `dev.tutorix.tech` | EC2 IP | `127.0.0.1:8080` | `web` |
| `dev-admin.tutorix.tech` | EC2 IP | `127.0.0.1:81` | `admin` |

Both SPAs proxy **`/api/`** to the same **`api`** container, so GraphQL stays same-origin on each subdomain.

**Already have nginx for `dev.tutorix.tech`?** Add only the admin blocks from **[`docker/nginx/host-ec2-admin-snippet.conf.example`](../docker/nginx/host-ec2-admin-snippet.conf.example)** to your existing Certbot site file — do not replace your tutor config.

### 1. Start / update Compose on EC2

From the repository root (after setting **`.env`** — include `GATEWAY_HTTP_PORT=8080` if tutor nginx already proxies to **8080**):

```bash
docker compose up -d --build
```

Verify locally on the instance:

```bash
curl -sI http://127.0.0.1:8080/ | head -1    # tutor SPA
curl -sI http://127.0.0.1:81/ | head -1      # admin SPA
```

### 2. Host nginx + TLS

**New install:** use **[`docker/nginx/host-ec2-reverse-proxy.conf.example`](../docker/nginx/host-ec2-reverse-proxy.conf.example)** (matches Certbot layout, tutor on **8080**).

**Existing `dev.tutorix.tech` site (your current setup):**

1. Add the **`dev-admin.tutorix.tech`** server block from **[`docker/nginx/host-ec2-admin-snippet.conf.example`](../docker/nginx/host-ec2-admin-snippet.conf.example)**.
2. Extend the port-**80** redirect block to include `dev-admin.tutorix.tech`.
3. Expand TLS to cover the admin hostname:

```bash
sudo certbot --nginx -d dev.tutorix.tech -d dev-admin.tutorix.tech
sudo nginx -t && sudo systemctl reload nginx
```

**Security group:** inbound **443** (and **80** for redirect). Compose ports **8080** and **81** bind to **127.0.0.1** only.

### 3. Environment for dev subdomains

```env
FRONTEND_URL=https://dev.tutorix.tech
CORS_ORIGINS=https://dev-admin.tutorix.tech
JWT_SECRET=...
# DB_* , AWS_* as already configured
```

Recreate containers after changing env:

```bash
docker compose up -d --build api web admin
```

### 4. Admin login

Ensure a dev user exists with role **`ADMIN`**. The admin app rejects non-admin roles after login.

## Prerequisites on EC2

1. **Docker Engine** and **Docker Compose plugin** (v2).
2. **Security group**: inbound **TCP 80** (and **443** if TLS terminates on instance); **22** restricted to your IP if using SSH.
3. Do **not** expose Postgres (**5432**) publicly when using the Compose `postgres` service.

### IAM instance role for S3 (recommended)

Use an **IAM instance profile** instead of long-lived `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in `.env`.

#### Step 1 — Create the IAM policy

In **AWS Console** → **IAM** → **Policies** → **Create policy** → **JSON**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "TutorixDocumentsObjectAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::tutorix-documents-dev/*"
    },
    {
      "Sid": "TutorixDocumentsListBucket",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::tutorix-documents-dev"
    }
  ]
}
```

Replace `tutorix-documents-dev` with your bucket name. Name the policy e.g. **`TutorixEC2DocumentsS3`**.

#### Step 2 — Create the IAM role

1. **IAM** → **Roles** → **Create role**
2. **Trusted entity**: **AWS service** → **EC2**
3. Attach policy **`TutorixEC2DocumentsS3`**
4. Name the role e.g. **`TutorixEC2Role`**

#### Step 3 — Attach the role to your EC2 instance

1. **EC2** → **Instances** → select your instance (`ip-172-31-34-27` / public IP `54.243.76.164`)
2. **Actions** → **Security** → **Modify IAM role**
3. Choose **`TutorixEC2Role`** → **Update IAM role**

No reboot required; credentials appear on the instance within ~1 minute.

#### Step 4 — Allow Docker containers to use instance credentials (critical)

The API runs **inside Docker**. By default EC2 metadata **hop limit** is **1**, so containers often **cannot** reach the instance role.

On the EC2 instance (SSH/SSM):

```bash
# Check current hop limit (1 = containers usually fail)
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/iam/info
```

Set **metadata hop limit to 2** (Console):

1. **EC2** → your instance → **Actions** → **Instance settings** → **Modify instance metadata options**
2. **Metadata accessible**: Enabled
3. **Metadata version**: V2 only (recommended)
4. **Metadata response hop limit**: **2**
5. Save

Or via AWS CLI (replace `i-xxxxxxxx`):

```bash
aws ec2 modify-instance-metadata-options \
  --instance-id i-xxxxxxxx \
  --http-endpoint enabled \
  --http-put-response-hop-limit 2 \
  --http-tokens required
```

#### Step 5 — Update server `.env` (remove access keys)

Keep region + bucket only:

```env
AWS_REGION=us-east-2
S3_DOCUMENTS_BUCKET=tutorix-documents-dev
```

Remove or comment out:

```env
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
```

Recreate the API container:

```bash
docker compose up -d
```

#### Step 6 — Verify credentials inside the container

```bash
# Should return access key starting with ASIA... (temporary role creds)
docker compose exec api sh -c 'curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/ 2>/dev/null || echo "IMDS from container failed - check hop limit"'

# Or test S3 from Node inside container
docker compose exec api node -e "
const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');
const c = new S3Client({ region: process.env.AWS_REGION });
c.send(new HeadBucketCommand({ Bucket: process.env.S3_DOCUMENTS_BUCKET }))
  .then(() => console.log('S3 OK'))
  .catch(e => console.error('S3 FAIL', e.message));
"
```

Then retry **RequestTutorDocumentUploadUrl** in the app.

#### Optional — AWS CLI one-shot (alternative to Console)

```bash
# Trust policy file trust-ec2.json: { "Version": "...", "Statement": [{ "Effect": "Allow", "Principal": { "Service": "ec2.amazonaws.com" }, "Action": "sts:AssumeRole" }] }

aws iam create-role --role-name TutorixEC2Role --assume-role-policy-document file://trust-ec2.json
aws iam put-role-policy --role-name TutorixEC2Role --policy-name TutorixDocumentsS3 --policy-document file://s3-policy.json
aws iam create-instance-profile --instance-profile-name TutorixEC2Profile
aws iam add-role-to-instance-profile --instance-profile-name TutorixEC2Profile --role-name TutorixEC2Role
aws ec2 associate-iam-instance-profile --instance-id i-xxxxxxxx --iam-instance-profile Name=TutorixEC2Profile
```

**Secrets Manager** (optional): add `secretsmanager:GetSecretValue` to the role only if the API loads DB credentials from Secrets Manager instead of `DB_*` env vars.

Avoid embedding long-lived keys on disk when the instance profile is sufficient.

## Configure environment

1. Copy **[`.env.docker.example`](../.env.docker.example)** to **`.env`** at the repository root (Compose reads it automatically).

2. Set at minimum:

   - **`JWT_SECRET`**: strong secret used by the API for JWT signing.
   - **`FRONTEND_URL`**: tutor app origin (e.g. `https://dev.tutorix.tech`).
   - **`CORS_ORIGINS`**: comma-separated extra origins (e.g. `https://dev-admin.tutorix.tech` for admin).

3. For AWS document uploads, set **`S3_DOCUMENTS_BUCKET`**, **`AWS_REGION`**, and either an **IAM instance role** (recommended) or **`AWS_ACCESS_KEY_ID`** / **`AWS_SECRET_ACCESS_KEY`** in `.env`. See [IAM instance role for S3](#iam-instance-role-for-s3-recommended) above.

## Start the stack

From the repository root:

```bash
docker compose up -d --build
```

Verify (via host nginx / public URLs):

- Tutor UI: `https://dev.tutorix.tech/`
- Admin UI: `https://dev-admin.tutorix.tech/`
- GraphQL: `https://dev.tutorix.tech/api/graphql` or same path on admin host

Optional: change Compose bind ports (defaults tutor **8080**, admin **81** on localhost):

```env
GATEWAY_HTTP_PORT=8080
ADMIN_HTTP_PORT=81
```

The **`api`** service is **not** published on the host by default (only **`expose`**). To debug the API directly, temporarily add under **`api`** in **`docker-compose.yml`**:

```yaml
ports:
  - '3000:3000'
```

Remember to remove it or firewall appropriately on production hosts.

## Database migrations

The API container supports **`AUTO_RUN_MIGRATIONS`** (see [`database.module.ts`](../apps/api/src/app/database/database.module.ts)). In Compose it defaults to **`true`**, so migrations apply **once per startup** when the stack boots against an empty or outdated schema.

**Trade-offs**

- **Pros**: simple EC2 deploys without a separate migration job.
- **Cons**: multiple replicas starting simultaneously could race; production teams sometimes disable auto-run and run migrations as an explicit job before rollout.

To disable automatic migrations:

```env
AUTO_RUN_MIGRATIONS=false
```

Then apply migrations using **one** of:

1. **Host-run CLI** (requires Node + repo checkout + DB reachable):  
   `npm run migration:run` — uses [`apps/api/src/data-source.ts`](../apps/api/src/data-source.ts) and `.env` with **`DB_*`** pointing at RDS or tunneled Postgres.

2. **Temporary Compose API shell** with source mounted (advanced): mount repo and run the same script inside a Node image.

Using **Amazon RDS** instead of Compose **`postgres`**: set **`DB_*`** in **`.env`** to RDS endpoints and credentials. Edit **`docker-compose.yml`** locally to remove the **`postgres`** service and the **`depends_on`** block under **`api`**, then ensure RDS security groups allow traffic **only from** the EC2 instance security group.

## HTTPS

Compose ships HTTP only. Typical patterns:

- **Application Load Balancer** with ACM certificate → target group → EC2:80.
- Or install certbot on the instance (outside this doc).

## Troubleshooting

| Issue | Check |
|-------|--------|
| Web loads but API calls fail CORS | **`FRONTEND_URL`** / **`CORS_ORIGINS`** include `https://dev.tutorix.tech` and `https://dev-admin.tutorix.tech` |
| Admin host shows tutor app | Host nginx **`server_name`** / proxy target — admin must go to **127.0.0.1:81** |
| 502 from host nginx | Compose running; **`curl http://127.0.0.1:8080`** and **`:81`** on EC2 |
| Migrations not applied | **`AUTO_RUN_MIGRATIONS`**, DB connectivity, logs at startup |
| S3 upload failures | Bucket policy, IAM role / keys, **`S3_DOCUMENTS_BUCKET`**, region; Docker needs **IMDS hop limit 2** for instance role |
| **`CredentialsProviderError`** in API | Role attached to EC2? Hop limit 2? Remove empty **`AWS_ACCESS_KEY_ID`** from `.env` or pass valid keys via Compose |

## Related docs

- [DOCUMENT_UPLOAD_STEPS.md](./DOCUMENT_UPLOAD_STEPS.md) — S3 env vars
- [MIGRATIONS_GUIDE.md](./MIGRATIONS_GUIDE.md) — TypeORM migrations CLI on developer machines
