# Shared GraphQL Library

This library contains all GraphQL queries, mutations, fragments, and Apollo Client setup that are shared across all apps (web, web-admin, mobile).

## Structure

```
libs/shared-graphql/
├── src/
│   ├── client/           # Apollo Client setup and configuration
│   │   ├── apollo-client.ts    # Apollo Client instance creation
│   │   ├── apollo-provider.tsx # React provider component
│   │   └── token-storage.ts    # Token storage utilities
│   ├── queries/          # GraphQL queries
│   │   ├── auth.queries.ts
│   │   └── index.ts
│   ├── mutations/        # GraphQL mutations
│   │   ├── auth.mutations.ts
│   │   └── index.ts
│   ├── fragments/        # Reusable GraphQL fragments
│   │   ├── user.fragments.ts
│   │   └── index.ts
│   └── index.ts          # Main exports
```

## Setup

### 1. Install Dependencies

Make sure `@apollo/client` is installed in the root `package.json`. For React Native apps, also install:

```bash
npm install @react-native-async-storage/async-storage
```

### 2. Configure GraphQL Endpoint

Set the GraphQL endpoint via environment variable:

```env
NX_GRAPHQL_ENDPOINT=http://localhost:3000/api/graphql
```

Or update the default in `libs/shared-graphql/src/client/apollo-client.ts`.

### 3. Use in Your App

All apps are already configured with the GraphQL provider. You can start using queries and mutations:

```tsx
import { useQuery, useMutation } from '@apollo/client';
import { GET_CURRENT_USER } from '@tutorix/shared-graphql/queries';
import { LOGIN } from '@tutorix/shared-graphql/mutations';

function MyComponent() {
  // Use query
  const { data, loading, error } = useQuery(GET_CURRENT_USER);
  
  // Use mutation
  const [login, { loading: loginLoading }] = useMutation(LOGIN);
  
  // ...
}
```

## Adding New Queries/Mutations

1. **Add queries** in `src/queries/` - create a new file or add to existing one
2. **Add mutations** in `src/mutations/` - create a new file or add to existing one
3. **Export** them in the respective `index.ts` files
4. **Import** in your components:

```tsx
import { NEW_QUERY } from '@tutorix/shared-graphql/queries';
import { NEW_MUTATION } from '@tutorix/shared-graphql/mutations';
```

## Token Management

The library provides utilities for managing auth tokens:

```tsx
import { setAuthToken, getAuthToken, removeAuthToken } from '@tutorix/shared-graphql/client';

// After login
await setAuthToken('your-jwt-token');

// Get token
const token = await getAuthToken();

// After logout
await removeAuthToken();
```

Tokens are automatically included in GraphQL requests via the auth link.

## Apollo Client Configuration

The Apollo Client is configured with:
- **HTTP Link**: Connects to your GraphQL endpoint
- **Auth Link**: Automatically adds JWT tokens to requests
- **Error Link**: Handles GraphQL and network errors
- **Retry Link**: Retries failed network requests
- **InMemoryCache**: Caches query results

To customize the client, you can create your own instance:

```tsx
import { createApolloClient } from '@tutorix/shared-graphql/client';
import { GraphQLProvider } from '@tutorix/shared-graphql';

const customClient = createApolloClient();

function App() {
  return (
    <GraphQLProvider client={customClient}>
      <YourApp />
    </GraphQLProvider>
  );
}
```

## Notes

- All queries, mutations, and fragments are shared across web, web-admin, and mobile apps
- Token storage automatically handles localStorage (web) and AsyncStorage (React Native)
- The client is configured to work seamlessly across all platforms
