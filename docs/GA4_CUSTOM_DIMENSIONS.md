# GA4 Custom Dimensions

Register these in **Google Analytics 4** → **Admin** → **Custom definitions** → **Create custom dimension**.

Firebase Analytics events from Tutorix clients already send these as event parameters. Registering them as custom dimensions enables filtering and explorations in GA4.

| Parameter | Scope | Description |
|-----------|-------|-------------|
| `user_role` | User | `TUTOR`, `STUDENT`, or `ADMIN` |
| `platform` | Event | `web`, `ios`, or `android` |
| `environment` | Event | `development`, `staging`, or `production` |
| `app_name` | Event | `web`, `mobile`, or `admin` — separates admin traffic from user apps |
| `step_id` | Event | Onboarding step id (Phase 2+) |
| `certification_stage` | User | Tutor certification stage (Phase 2+) |
| `onboarding_complete` | User | Whether tutor onboarding is complete (Phase 2+) |

## Verify events

1. Open [Firebase Console](https://console.firebase.google.com) → Analytics → **DebugView** (enable debug mode in dev).
2. Or GA4 → **Admin** → **DebugView**.
3. Navigate the app and confirm `page_view` / `screen_view` events include `app_name` and `environment`.

## BigQuery export (optional, Phase 5)

Enable **Admin** → **BigQuery Links** when you need SQL-based funnels or cohort reports beyond GA4 Explorations.
