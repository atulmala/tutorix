---
title: Web Session Bootstrap (Admin-like)
status: done
jira: null
overview: Add admin-style session bootstrap to the web app so reload restores JWT session, user state, and post-login routing for tutors and students.
todos:
  - id: web-auth-provider
    content: Create WebAuthProvider in apps/web/src/app/auth/useWebAuth.tsx (bootstrap, clearSession, logout, loading)
    status: completed
  - id: loading-gate
    content: Add SessionLoadingGate and wrap App inside WebAuthProvider below GraphQLProvider
    status: completed
  - id: shared-routing
    content: Extract routeAfterAuthenticatedUser in app.tsx; call from handleLoginSuccess and bootstrap useEffect
    status: completed
  - id: reset-token-priority
    content: Ensure ?token= reset-password URL takes precedence over session restore routing
    status: completed
  - id: web-auth-tests
    content: Update app.spec.tsx with token-storage and Apollo mocks for bootstrap cases
    status: completed
---

# Web Session Bootstrap (Admin-like)

See implementation in:

- `apps/web/src/app/auth/useWebAuth.tsx`
- `apps/web/src/app/auth/SessionLoadingGate.tsx`
- `apps/web/src/app/app.tsx`
