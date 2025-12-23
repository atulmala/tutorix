# Tutorix - Connect, Learn, Grow

Tutorix is a comprehensive platform connecting students with tutors for online and offline learning.

## Tech Stack
- **Monorepo**: Nx
- **Backend**: NestJS, GraphQL, PostgreSQL (with TypeORM)
- **Web**: React (Student/Tutor Portal + Admin Dashboard)
- **Mobile**: React Native (Student/Tutor App)

## Applications

### 1. API (`apps/api`)
The core backend service powered by NestJS. Exposes a GraphQL API.

#### GraphQL Endpoints
Once the API is running:
- **GraphQL Playground**: `http://localhost:3000/api/graphql` - Interactive GraphQL IDE
- **GraphQL Endpoint**: `http://localhost:3000/api/graphql` - GraphQL API endpoint

The GraphQL schema is auto-generated from your resolvers and saved to `apps/api/src/schema.gql`.

**Test Query Example:**
```graphql
query {
  hello
}
```

### 2. Web App (`apps/web`)
The main portal for students and tutors.
- **URL**: `tutorix.com` (Local: `http://localhost:4200`)

### 3. Admin App (`apps/web-admin`)
The administration dashboard.
- **URL**: `admin.tutorix.com` (Local: `http://localhost:4201`)

### 4. Mobile App (`apps/mobile`)
Cross-platform mobile application for students and tutors.

## Getting Started

### Prerequisites
- Node.js v18+ (Recommended: v20)
- npm or yarn

### Installation
```bash
npm install
```

### Environment Configuration
1. Copy `.env.example` to `.env` (if it exists)
2. Update the `.env` file with your configuration
3. **Important**: See [SECURITY.md](./SECURITY.md) for best practices on managing secrets, especially for production environments.

**Required Environment Variables for API:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=tutorix
```

### Database Migrations

The project uses TypeORM migrations for database schema management. See [MIGRATIONS_GUIDE.md](./docs/MIGRATIONS_GUIDE.md) for detailed instructions.

**Quick Migration Commands:**
- Generate migration: `npm run migration:generate -- apps/api/src/migrations/MigrationName`
- Run migrations: `npm run migration:run`
- Revert last migration: `npm run migration:revert`
- Show migration status: `npm run migration:show`

**Workflow:**
1. Create/modify entities in `apps/api/src/app/entities/`
2. Generate migration: `npm run migration:generate -- apps/api/src/migrations/YourMigrationName`
3. Review the generated migration file
4. Run migration: `npm run migration:run`

### Running Applications

All commands automatically watch for file changes and reload:

- **API**: `npm run serve:api` or `npx nx serve api`
  - Auto-rebuilds and restarts on file changes (via Nx continuous mode)
  - **Note**: Requires Nx daemon to be running for auto-restart. Start it with `npm run nx:daemon` or `npx nx daemon --start`
- **Web**: `npm run serve:web` or `npx nx serve web`
  - Hot Module Replacement (HMR) via Vite - instant updates without full reload
- **Admin**: `npm run serve:admin` or `npx nx serve web-admin`
  - Hot Module Replacement (HMR) via Vite - instant updates without full reload
- **Mobile (iOS)**: `npm run mobile:ios` or `npx nx run-ios mobile`
  - Hot reloading via Metro bundler
- **Mobile (Android)**: `npm run mobile:android` or `npx nx run-android mobile`
  - Hot reloading via Metro bundler

#### Enabling Auto-Restart for API

For the API to automatically restart on file changes, the Nx daemon must be running. Try these steps:

**Step 1: Start the daemon explicitly**
```bash
# In a separate terminal, start the daemon and keep it running
npx nx daemon --start
```

**Step 2: Verify the daemon is running**
```bash
# Check daemon status
npx nx daemon --status
```

**Step 3: Start the API**
```bash
# In another terminal, start the API
npm run serve:api
```

**Troubleshooting:**
- If the daemon still doesn't start, try: `npx nx reset` then `npx nx daemon --start`
- The daemon must be running in a separate process/terminal
- Make sure you're using the same Node.js version that Nx was installed with
- If issues persist, you can manually restart the server when files change (the warning is informational)

> **Note**: Nx provides built-in watch functionality for all projects. The API uses Nx's continuous mode (requires daemon), while web apps use Vite's HMR and mobile uses Metro's hot reloading. The warning about the daemon not running is informational - the server will still work, but won't auto-restart on file changes.

## Testing
Run unit tests:
```bash
npx nx test api
npx nx test web
```
Run e2e tests:
```bash
npx nx e2e web-e2e
```
