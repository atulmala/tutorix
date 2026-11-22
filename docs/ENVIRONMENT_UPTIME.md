# Tutorix environment uptime (EC2)

Google Play / App Store release means **production must stay up 24×7**. **Staging stays stopped** unless you are actively testing.

## Instances (us-east-1)

| Environment | Name tag | Instance ID | Public IP | Hostnames |
|-------------|----------|-------------|-----------|-----------|
| **Production** | `tutorix-production` | `i-02c8f353467b88ec9` | `100.24.243.181` | `www.tutorix.tech`, `admin.tutorix.tech` |
| **Staging** | `tutorix-dev` | `i-066ca9810c7218e87` | `54.243.76.164` | `dev.tutorix.tech`, `dev-admin.tutorix.tech` |

Both use the same Docker stack — see [DEPLOYMENT_EC2.md](./DEPLOYMENT_EC2.md).

## Policy (from Nov 2026)

| Environment | EC2 schedule |
|-------------|----------------|
| **Production** | Always **running** (no nightly stop) |
| **Staging** | Always **stopped**; start only for a test window, then stop again |

### Legacy schedule (disable for production)

Previously both hosts followed **09:00–22:00 IST** (start **03:30 UTC**, stop **16:30 UTC**). Staging last stopped with reason around **16:30 UTC** — that pattern should **not** apply to production anymore.

## One-time AWS change (admin console)

The IAM user `classup` can start/stop EC2 and use SSM but **cannot** list or edit EventBridge rules. Someone with **EventBridge / Scheduler** access must:

1. Open **EventBridge** → **Rules** (or **Scheduler** → **Schedules**) in **us-east-1**.
2. Find rules that **start** and **stop** Tutorix EC2 instances (names often include `tutorix`, `start`, `stop`, or **Instance Scheduler** stack outputs).
3. **Production (`i-02c8f353467b88ec9`):**
   - Remove it from any **stop** schedule, **or** assign an “always on” schedule if you use [Instance Scheduler](https://docs.aws.amazon.com/solutions/latest/instance-scheduler-on-aws/welcome.html).
   - Remove **start** rules if they only exist to match the old daytime window (the instance should not be stopped nightly).
4. **Staging (`i-066ca9810c7218e87`):**
   - **Disable or delete** any **automatic start** rule (no 09:00 IST boot).
   - Keep or add a **stop** rule only if you want a safety net after manual starts; otherwise rely on manual `stop` below.

If you use **Instance Scheduler** (DynamoDB registry rather than tags), open the solution’s **Schedules** / **Periods** in the stack console and register **only staging** for manual or ad-hoc use — **exclude production** from stop periods.

After changes, confirm in **EC2** → **Instances** that production stays **running** past 22:00 IST and staging remains **stopped** unless you started it.

## Manual start / stop (CLI)

From the repo root (AWS credentials with `ec2:StartInstances` / `StopInstances` and SSM):

```bash
# Production — should rarely be needed after scheduler fix
bash scripts/tutorix-aws-env.sh production start
bash scripts/tutorix-aws-env.sh production status

# Staging — for testing only
bash scripts/tutorix-aws-env.sh staging start
# … run tests …
bash scripts/tutorix-aws-env.sh staging stop
```

`start` waits for the instance, then runs `docker compose up -d` via **SSM** as `ssm-user` in `/home/ssm-user/tutorix`.

`stop` only stops the **EC2** instance (apps go down with the host). Staging RDS, if shared, is unchanged — only start staging when the database is reachable.

## After production starts (cold boot)

1. Instance reaches **running**.
2. SSM agent online (typically &lt; 2 minutes).
3. Compose brings up `api`, `web`, `admin` (see script).
4. Smoke test:

```bash
curl -sI https://www.tutorix.tech/ | head -1
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://www.tutorix.tech/api/graphql \
  -H 'Content-Type: application/json' -d '{"query":"{ __typename }"}'
```

## Related

- [DEPLOYMENT_EC2.md](./DEPLOYMENT_EC2.md) — deploy and env vars
- [STORE_LISTING.md](./STORE_LISTING.md) — store release (production must be always available)