# Testing Strategy for Tutorix

## Overview

This document outlines a comprehensive testing strategy for Tutorix to ensure regression prevention and confidence in new feature deployments. The strategy follows the testing pyramid principle with focus on automation and continuous integration.

## Testing Pyramid

```
        /\
       /  \
      / E2E \         <-- Few, Critical User Journeys (10-20%)
     /--------\
    /Integration\     <-- API/Service Layer Tests (30-40%)
   /------------\
  /   Unit Tests  \   <-- Fast, Isolated Tests (50-60%)
 /----------------\
```

## Test Types & Coverage

### 1. Unit Tests (50-60% of tests)
**Focus:** Fast, isolated tests for individual functions, classes, and components

**Backend (NestJS):**
- ✅ Service methods (auth, password, OTP, analytics)
- ✅ Utility functions
- ✅ DTO validation
- ✅ Entity business logic
- ✅ Repository methods (mocked dependencies)

**Frontend (React):**
- ✅ React components (with React Testing Library)
- ✅ Custom hooks (`useSignupTracking`, etc.)
- ✅ Utility functions
- ✅ Form validation logic
- ✅ State management

**Target Coverage:** 80%+ code coverage

### 2. Integration Tests (30-40% of tests)
**Focus:** Testing interactions between multiple units/modules

**Backend:**
- ✅ GraphQL resolvers with test database
- ✅ Authentication flows (login, signup, password reset)
- ✅ Database operations (TypeORM repositories)
- ✅ API endpoints (HTTP requests to running server)
- ✅ Service integration (auth + JWT + database)

**Frontend:**
- ✅ Component integration (multiple components together)
- ✅ Apollo Client queries/mutations (with mock server)
- ✅ Form submission flows
- ✅ Navigation flows

**Target Coverage:** 70%+ critical paths

### 3. End-to-End (E2E) Tests (10-20% of tests)
**Focus:** Complete user journeys from UI to database

**Critical User Journeys:**
1. ✅ **User Registration Flow**
   - Basic details → Phone verification → Email verification → Completion
   
2. ✅ **Login Flow**
   - Email/mobile login → Password validation → Token generation
   - Incomplete signup handling
   
3. ✅ **Password Reset Flow**
   - Forgot password → Email link → Reset password → Login
   
4. ✅ **Profile Management**
   - Update user details → Save → Verify changes

**Tools:**
- **Web:** Cypress (already configured)
- **Mobile:** Detox or React Native Testing Library + E2E
- **API:** Supertest + Test database

**Target Coverage:** All critical user journeys

## Test Organization Structure

```
apps/
├── api/
│   ├── src/
│   │   ├── app/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── services/
│   │   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   │   └── auth.service.spec.ts        <-- Unit tests
│   │   │   │   │   ├── resolvers/
│   │   │   │   │   │   ├── auth.resolver.ts
│   │   │   │   │   │   └── auth.resolver.spec.ts       <-- Integration tests
│   │   │   │   │   └── __tests__/
│   │   │   │   │       └── auth.integration.spec.ts    <-- Module-level integration
│   │   │   │   └── ...
│   │   │   └── ...
│   │   └── ...
│   └── e2e/
│       └── src/
│           ├── auth/
│           │   ├── login.e2e.spec.ts                   <-- E2E tests
│           │   ├── signup.e2e.spec.ts
│           │   └── password-reset.e2e.spec.ts
│           └── ...

apps/
├── web/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── Login/
│   │   │   │   │   ├── Login.tsx
│   │   │   │   │   └── Login.spec.tsx                  <-- Component unit tests
│   │   │   │   └── ...
│   │   │   ├── hooks/
│   │   │   │   ├── useSignupTracking.ts
│   │   │   │   └── useSignupTracking.spec.ts           <-- Hook unit tests
│   │   │   └── ...
│   │   └── ...
│   └── e2e/
│       └── src/
│           ├── features/
│           │   ├── auth/
│           │   │   ├── login.cy.ts                     <-- E2E tests
│   │   │   │   ├── signup.cy.ts
│   │   │   │   └── password-reset.cy.ts
│   │   │   └── ...
│           └── ...
```

## Test Implementation Priorities

### Phase 1: Critical Paths (Weeks 1-2)
**Priority: HIGH - Implement immediately**

1. **Authentication & Authorization**
   - ✅ Login (email/mobile)
   - ✅ Signup flow (all steps)
   - ✅ Password reset flow
   - ✅ JWT token validation
   - ✅ Protected routes

2. **User Management**
   - ✅ User creation
   - ✅ User updates
   - ✅ Email/mobile verification
   - ✅ Signup completion checks

### Phase 2: Core Features (Weeks 3-4)
**Priority: HIGH - Essential for stability**

1. **GraphQL API**
   - ✅ Query validation
   - ✅ Mutation validation
   - ✅ Error handling
   - ✅ Authentication middleware

2. **Database Operations**
   - ✅ CRUD operations
   - ✅ Relationships (User → Tutor, etc.)
   - ✅ Migrations validation

### Phase 3: Supporting Features (Weeks 5-6)
**Priority: MEDIUM - Important but not critical**

1. **Analytics**
   - ✅ Event tracking
   - ✅ User properties
   - ✅ Platform tracking

2. **UI Components**
   - ✅ Form components
   - ✅ Navigation
   - ✅ Error handling

## Test Utilities & Helpers

### Backend Test Utilities

```typescript
// apps/api/src/app/common/test-utils/test-database.ts
export async function setupTestDatabase() {
  // Create isolated test database
  // Run migrations
  // Return connection
}

// apps/api/src/app/common/test-utils/test-helpers.ts
export async function createTestUser(userData?: Partial<User>): Promise<User> {
  // Helper to create test users
}

export async function loginAsTestUser(credentials: LoginInput): Promise<string> {
  // Helper to get auth tokens for testing
}

// apps/api/src/app/common/test-utils/graphql-client.ts
export function createTestGraphQLClient(token?: string) {
  // Helper for GraphQL query/mutation testing
}
```

### Frontend Test Utilities

```typescript
// apps/web/src/test-utils/mocks/apollo-mocks.ts
export function createMockApolloClient() {
  // Mock Apollo Client for component testing
}

// apps/web/src/test-utils/render-helpers.tsx
export function renderWithProviders(ui: ReactElement) {
  // Render component with all providers (Apollo, Analytics, etc.)
}

// apps/web-e2e/src/support/commands.ts (extend existing)
Cypress.Commands.add('loginViaGraphQL', (email: string, password: string) => {
  // Custom command for E2E login
});

Cypress.Commands.add('completeSignup', (userData) => {
  // Custom command for E2E signup
});
```

## CI/CD Integration

### Pre-commit Hooks
```bash
# .husky/pre-commit (if using husky)
npm run lint:all
npm run test:affected  # Run tests for changed files only
npm run test:e2e:affected
```

### GitHub Actions / CI Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:all -- --coverage
      - uses: codecov/codecov-action@v3
      
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: tutorix_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run migration:run
      - run: npm run test:api -- --testPathPattern=integration
      
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build:api
      - run: npm run build:web
      - run: npm run serve:api &
      - run: npm run serve:web &
      - run: npm run e2e:web
      - run: npm run e2e:api
```

### Nx Affected Tests (Recommended)
```bash
# Run tests only for affected projects
npx nx affected -t test

# Run E2E tests for affected projects
npx nx affected -t e2e

# Run all tests with coverage
npx nx run-many -t test --coverage
```

## Coverage Goals

### Code Coverage Targets
- **Unit Tests:** 80%+ coverage
- **Integration Tests:** 70%+ coverage of critical paths
- **E2E Tests:** 100% of critical user journeys

### Coverage Reports
```bash
# Generate coverage reports
npm run test:all -- --coverage

# View coverage in browser
open coverage/lcov-report/index.html

# CI integration
# Use codecov.io or similar service
```

## Best Practices

### 1. Test Naming Convention
```typescript
// Unit test
describe('AuthService', () => {
  describe('login', () => {
    it('should return tokens when credentials are valid', () => {});
    it('should throw UnauthorizedException when password is invalid', () => {});
    it('should check isSignupComplete before allowing login', () => {});
  });
});

// Integration test
describe('AuthResolver (Integration)', () => {
  describe('login mutation', () => {
    it('should login user and return auth response', () => {});
  });
});

// E2E test
describe('User Authentication Flow', () => {
  it('should complete full login journey', () => {});
});
```

### 2. Test Isolation
- ✅ Each test should be independent
- ✅ Use `beforeEach` to set up test data
- ✅ Use `afterEach` to clean up
- ✅ Use test database (separate from dev/staging)

### 3. Test Data Management
- ✅ Use factories for test data creation
- ✅ Use fixtures for complex test scenarios
- ✅ Clean up test data after tests

### 4. Mocking Strategy
- ✅ Mock external services (email, SMS, analytics)
- ✅ Mock expensive operations (database for unit tests)
- ✅ Use real database for integration/E2E tests
- ✅ Use MSW (Mock Service Worker) for GraphQL mocking in frontend

## Recommended Tools & Libraries

### Backend Testing
- ✅ **Jest** (already configured) - Unit & Integration
- ✅ **@nestjs/testing** - NestJS test utilities
- ✅ **supertest** - HTTP endpoint testing
- ✅ **pg-mem** or **sqlite** - In-memory database for unit tests
- ✅ **testcontainers** - Real database for integration tests

### Frontend Testing
- ✅ **Jest** + **React Testing Library** (already configured)
- ✅ **MSW (Mock Service Worker)** - GraphQL mocking
- ✅ **Cypress** (already configured) - E2E testing
- ✅ **@testing-library/user-event** - User interaction simulation

### Mobile Testing
- ✅ **Jest** + **React Native Testing Library**
- ✅ **Detox** - E2E testing for React Native
- ✅ **Mockingbird** - Mock React Native modules

## Testing Checklist for New Features

When implementing a new feature, ensure:

- [ ] Unit tests for business logic
- [ ] Integration tests for API/service layer
- [ ] E2E tests for critical user journeys
- [ ] Test edge cases and error scenarios
- [ ] Test validation and error messages
- [ ] Update test documentation
- [ ] Ensure tests pass in CI
- [ ] Review test coverage

## Monitoring & Maintenance

### Test Health Metrics
- Test execution time (target: <5 min for unit, <15 min for E2E)
- Test failure rate (target: <2%)
- Flaky test rate (target: 0%)
- Coverage trend (should increase or maintain)

### Regular Maintenance
- Review and update tests quarterly
- Remove obsolete tests
- Refactor slow tests
- Fix flaky tests immediately
- Update test dependencies

## Getting Started

### Quick Start Commands

```bash
# Run all tests
npm run test:all

# Run tests for specific project
npm run test:api
npm run test:web

# Run tests in watch mode
npx nx test api --watch

# Run E2E tests
npm run e2e:web
npm run e2e:api

# Generate coverage report
npm run test:all -- --coverage

# Run affected tests only (great for CI)
npx nx affected -t test
npx nx affected -t e2e
```

## Next Steps

1. **Week 1:** Set up test utilities and helpers
2. **Week 2:** Implement critical path tests (auth, signup, login)
3. **Week 3:** Add integration tests for GraphQL resolvers
4. **Week 4:** Implement E2E tests for user journeys
5. **Week 5:** Set up CI/CD pipeline
6. **Week 6:** Establish coverage goals and monitoring

---

**Last Updated:** 2026-01-10
**Owner:** Development Team
