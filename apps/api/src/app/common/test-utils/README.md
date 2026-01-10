# Test Utilities

This directory contains shared test utilities and helpers for backend testing.

## Utilities

### Test Database
- `test-database.ts` - Setup and teardown test database
- `test-helpers.ts` - Common test helpers (createUser, loginUser, etc.)
- `graphql-client.ts` - GraphQL client for testing

### Test Data Factories
- `factories/user.factory.ts` - User test data factory
- `factories/tutor.factory.ts` - Tutor test data factory

## Usage

```typescript
import { setupTestDatabase, teardownTestDatabase } from '../common/test-utils/test-database';
import { createTestUser, loginAsTestUser } from '../common/test-utils/test-helpers';

describe('AuthService', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should login user', async () => {
    const user = await createTestUser({ email: 'test@example.com' });
    const token = await loginAsTestUser({ loginId: user.email, password: 'password' });
    expect(token).toBeDefined();
  });
});
```
