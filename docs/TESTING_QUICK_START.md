# Testing Quick Start Guide

This guide will help you quickly start writing and running tests for Tutorix.

## Setup

### 1. Install Additional Test Dependencies (if needed)

```bash
# For API testing
npm install --save-dev supertest @types/supertest

# For mocking in frontend
npm install --save-dev msw

# For better test utilities
npm install --save-dev @testing-library/user-event
```

### 2. Setup Test Database

For integration and E2E tests, you'll need a separate test database:

```bash
# Create test database
createdb tutorix_test

# Or via psql
psql -U postgres -c "CREATE DATABASE tutorix_test;"
```

### 3. Environment Variables for Testing

Create a `.env.test` file in the project root:

```env
NODE_ENV=test
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=tutorix_test
JWT_SECRET=test-jwt-secret-for-testing
```

## Writing Your First Test

### Backend Unit Test Example

```typescript
// apps/api/src/app/modules/auth/services/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        // Add other mocked dependencies...
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  describe('login', () => {
    it('should successfully login user with valid credentials', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed_password',
        active: true,
        isSignupComplete: true,
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      
      // Act
      const result = await service.login({
        loginId: 'test@example.com',
        password: 'password',
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
    });
  });
});
```

### Frontend Component Test Example

```typescript
// apps/web/src/app/components/Login/Login.spec.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Login } from './Login';
import { MockedProvider } from '@apollo/client/testing';
import { LOGIN } from '@tutorix/shared-graphql/mutations';

const mocks = [
  {
    request: {
      query: LOGIN,
      variables: {
        input: {
          loginId: 'test@example.com',
          password: 'Test123456',
        },
      },
    },
    result: {
      data: {
        login: {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          user: {
            id: 1,
            email: 'test@example.com',
          },
        },
      },
    },
  },
];

describe('Login Component', () => {
  it('should render login form', () => {
    render(
      <MockedProvider mocks={mocks}>
        <Login onLogin={jest.fn()} onSignUp={jest.fn()} />
      </MockedProvider>
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('should submit login form with valid data', async () => {
    const onLogin = jest.fn();
    
    render(
      <MockedProvider mocks={mocks}>
        <Login onLogin={onLogin} onSignUp={jest.fn()} />
      </MockedProvider>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Test123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalled();
    });
  });
});
```

### E2E Test Example

```typescript
// apps/web-e2e/src/e2e/auth/login.cy.ts
describe('Login Flow', () => {
  it('should successfully login user', () => {
    cy.visit('/');
    
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('Test123456');
    cy.get('[data-testid="login-button"]').click();
    
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="user-profile"]').should('be.visible');
  });
});
```

## Running Tests

### Run All Tests
```bash
npm run test:all
```

### Run Tests for Specific Project
```bash
# Backend
npm run test:api

# Frontend
npm run test:web

# Admin
npm run test:admin
```

### Run Tests in Watch Mode
```bash
npx nx test api --watch
```

### Run Tests with Coverage
```bash
npm run test:api -- --coverage
```

### Run E2E Tests
```bash
# Web E2E
npm run e2e:web

# API E2E
npm run e2e:api
```

### Run Only Affected Tests (Great for CI)
```bash
npx nx affected -t test
npx nx affected -t e2e
```

## Test Data Attributes

Add `data-testid` attributes to your components for easier E2E testing:

```tsx
// Example: Login component
<input
  data-testid="email-input"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

<button data-testid="login-button" onClick={handleLogin}>
  Login
</button>

<div data-testid="error-message" className={error ? 'visible' : 'hidden'}>
  {error}
</div>
```

## Common Testing Patterns

### Mocking GraphQL Queries/Mutations

```typescript
import { MockedProvider } from '@apollo/client/testing';
import { LOGIN } from '@tutorix/shared-graphql/mutations';

const mocks = [
  {
    request: {
      query: LOGIN,
      variables: { input: { loginId: 'test@example.com', password: 'pass' } },
    },
    result: {
      data: {
        login: { accessToken: 'token', user: { id: 1 } },
      },
    },
  },
];

render(
  <MockedProvider mocks={mocks}>
    <YourComponent />
  </MockedProvider>
);
```

### Testing with Test Database

```typescript
import { DataSource } from 'typeorm';
import { createTestDatabase, dropTestDatabase } from '../common/test-utils/test-database';
import { createTestUser } from '../common/test-utils/test-helpers';

describe('AuthService Integration', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await createTestDatabase();
  });

  afterAll(async () => {
    await dropTestDatabase(dataSource);
  });

  it('should create and login user', async () => {
    const user = await createTestUser(dataSource, {
      email: 'test@example.com',
    });
    // Test login...
  });
});
```

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Arrange-Act-Assert**: Structure tests clearly with setup, execution, and verification
3. **Descriptive Names**: Use clear test names that describe what is being tested
4. **One Assertion Per Test**: Focus each test on a single behavior
5. **Mock External Dependencies**: Mock services like analytics, email, etc.
6. **Use Test Data Factories**: Create reusable factories for test data
7. **Clean Up**: Always clean up test data after tests

## Next Steps

1. Start with unit tests for critical services (AuthService, PasswordService)
2. Add integration tests for GraphQL resolvers
3. Add component tests for critical UI components
4. Add E2E tests for critical user journeys
5. Set up CI/CD pipeline (use `.github/workflows/test.yml` as template)

## Resources

- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [React Testing Library](https://testing-library.com/react)
- [Cypress Documentation](https://docs.cypress.io/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Strategy](./TESTING_STRATEGY.md)
