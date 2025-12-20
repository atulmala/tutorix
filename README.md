# Tutorix - Connect, Learn, Grow

Tutorix is a comprehensive platform connecting students with tutors for online and offline learning.

## Tech Stack
- **Monorepo**: Nx
- **Backend**: NestJS, GraphQL, MongoDB
- **Web**: React (Student/Tutor Portal + Admin Dashboard)
- **Mobile**: React Native (Student/Tutor App)

## Applications

### 1. API (`apps/api`)
The core backend service powered by NestJS. Exposes a GraphQL API.

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

For the API to automatically restart on file changes, the Nx daemon must be running:

```bash
# Start the Nx daemon (run this once, or in a separate terminal)
npm run nx:daemon

# Then in another terminal, start the API
npm run serve:api
```

The daemon will automatically start in most cases, but if you see a warning about the daemon not running, start it explicitly.

> **Note**: Nx provides built-in watch functionality for all projects. The API uses Nx's continuous mode (requires daemon), while web apps use Vite's HMR and mobile uses Metro's hot reloading.

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
