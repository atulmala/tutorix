# Deploy Tutorix on EC2 with Docker

This repository ships **`docker-compose.yml`** plus **`docker/Dockerfile.api`** and **`docker/Dockerfile.web`** to run **PostgreSQL**, **NestJS GraphQL API**, and **nginx + static web UI** on a single host (EC2 or equivalent).

## What runs

| Service   | Role |
|-----------|------|
| `postgres` | PostgreSQL 16 with persistent volume `tutorix_pgdata` |
| `api`      | NestJS bundle listening on port **3000** inside the Compose network only |
| `web`      | nginx serves SPA from `apps/web` build and proxies **`/api/`** → `http://api:3000/api/` |

Public HTTP entrypoint is **`web`** on host port **`GATEWAY_HTTP_PORT`** (default **80**).

GraphQL endpoint from the browser: **`http(s)://<your-host>/api/graphql`** (same-origin when using the default **`VITE_GRAPHQL_ENDPOINT=/api/graphql`** build arg).

## Prerequisites on EC2

1. **Docker Engine** and **Docker Compose plugin** (v2).
2. **Security group**: inbound **TCP 80** (and **443** if TLS terminates on instance); **22** restricted to your IP if using SSH.
3. Do **not** expose Postgres (**5432**) publicly when using the Compose `postgres` service.

### IAM (recommended)

Attach an **IAM instance profile** granting:

- **S3**: `PutObject`, `GetObject`, `DeleteObject` on your documents bucket prefix (tutor uploads).
- **Secrets Manager** (optional): only if `AWS_SECRET_NAME` / loader paths are used for DB credentials instead of plain env vars.

Avoid embedding long-lived keys on disk when instance profile is sufficient.

## Configure environment

1. Copy **[`.env.docker.example`](../.env.docker.example)** to **`.env`** at the repository root (Compose reads it automatically).

2. Set at minimum:

   - **`JWT_SECRET`**: strong secret used by the API for JWT signing.
   - **`FRONTEND_URL`**: exact browser origin users use (e.g. `http://ec2-xx-xx-xx-xx.compute.amazonaws.com` or `https://app.example.com`). This feeds **CORS** via [`apps/api/src/main.ts`](../apps/api/src/main.ts); optional **`CORS_ORIGINS`** adds comma-separated extra origins.

3. For AWS document uploads, set **`S3_DOCUMENTS_BUCKET`**, **`AWS_REGION`**, and credentials **or** rely on the instance profile.

## Start the stack

From the repository root:

```bash
docker compose up -d --build
```

Verify:

- UI: `http://<ec2-host>/`
- GraphQL: `http://<ec2-host>/api/graphql` (POST from Apollo Client or GET playground when enabled)

Optional: bind gateway to another host port:

```bash
GATEWAY_HTTP_PORT=8080 docker compose up -d
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
- Or install certbot / Caddy on the instance (outside this doc).

## Troubleshooting

| Issue | Check |
|-------|--------|
| Web loads but API calls fail CORS | **`FRONTEND_URL`** / **`CORS_ORIGINS`** match browser origin; mobile apps need their origins listed |
| 502 from nginx on `/api/` | **`api`** container healthy; **`docker compose logs api`** |
| Migrations not applied | **`AUTO_RUN_MIGRATIONS`**, DB connectivity, logs at startup |
| S3 upload failures | Bucket policy, IAM role / keys, **`S3_DOCUMENTS_BUCKET`**, region |

## Related docs

- [DOCUMENT_UPLOAD_STEPS.md](./DOCUMENT_UPLOAD_STEPS.md) — S3 env vars
- [MIGRATIONS_GUIDE.md](./MIGRATIONS_GUIDE.md) — TypeORM migrations CLI on developer machines
