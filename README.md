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

#### API Documentation (Swagger)
Once the API is running, Swagger documentation is available at:
- **URL**: `http://localhost:3000/api/docs`

The Swagger UI provides interactive API testing and documentation for all endpoints.

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
- **API**: `npx nx serve api`
- **Web**: `npx nx serve web`
- **Admin**: `npx nx serve web-admin`
- **Mobile (iOS)**: `npx nx run-ios mobile`
- **Mobile (Android)**: `npx nx run-android mobile`

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
