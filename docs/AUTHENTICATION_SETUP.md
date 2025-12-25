# Authentication Setup

This document describes the authentication system implemented in Tutorix.

## Overview

The authentication system uses **JWT (JSON Web Tokens)** with **Passport.js** for token-based authentication. It supports:
- **Tutors and Students**: Login with mobile numbers
- **Admins**: Login with email addresses (e.g., admin@tutorix.com)

## Architecture

### Components

1. **User Entity**: Stores user information (mobile for tutors/students, email for admins)
2. **RefreshToken Entity**: Stores refresh tokens for token rotation and revocation
3. **Auth Service**: Handles login, registration, and token management
4. **JWT Service**: Manages token generation, validation, and refresh
5. **Password Service**: Handles password hashing using bcrypt
6. **Guards**: Protect GraphQL resolvers (JwtAuthGuard, RolesGuard)
7. **Decorators**: Extract current user and check roles (@CurrentUser, @Roles)

## Installation

Install the required packages:

```bash
npm install @nestjs/jwt @nestjs/passport @nestjs/config passport passport-jwt passport-local bcrypt
npm install -D @types/passport-jwt @types/passport-local @types/bcrypt
```

**Note**: If you're using `.env` files, `@nestjs/config` will handle loading them. If you're using AWS Secrets Manager in production, ensure your existing setup works with ConfigService.

## Environment Variables

Add these to your `.env` file:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
```

**Important**: In production, use a strong, randomly generated secret (minimum 32 characters). Store it securely using AWS Secrets Manager or similar (see [SECURITY.md](../SECURITY.md)).

## Database Migration

After installing dependencies, generate and run migrations:

```bash
npm run migration:generate
npm run migration:run
```

This will create the `user` and `refresh_token` tables.

## Usage

### Registration

Register a new user (Tutor, Student, or Admin):

```graphql
mutation {
  register(input: {
    role: TUTOR
    mobile: "+1234567890"
    password: "securePassword123"
    firstName: "John"
    lastName: "Doe"
  }) {
    accessToken
    refreshToken
    expiresIn
    user {
      id
      mobile
      role
      firstName
      lastName
    }
  }
}
```

**Note**:
- For **TUTOR** or **STUDENT**: `mobile` is required, `email` is optional
- For **ADMIN**: `email` is required, `mobile` is optional

### Login

Login with mobile (tutors/students) or email (admins):

```graphql
mutation {
  login(input: {
    loginId: "+1234567890"  # or "admin@tutorix.com" for admin
    password: "securePassword123"
  }) {
    accessToken
    refreshToken
    expiresIn
    user {
      id
      mobile
      email
      role
      firstName
      lastName
    }
  }
}
```

### Refresh Token

Refresh access token using refresh token:

```graphql
mutation {
  refreshToken(input: {
    refreshToken: "your-refresh-token-here"
  }) {
    accessToken
    refreshToken
    expiresIn
    user {
      id
      role
    }
  }
}
```

### Get Current User

Get the currently authenticated user:

```graphql
query {
  me {
    id
    mobile
    email
    role
    firstName
    lastName
  }
}
```

**Headers required**:
```
Authorization: Bearer <access-token>
```

### Logout

Logout from current device:

```graphql
mutation {
  logout(refreshToken: "your-refresh-token-here")
}
```

### Logout from All Devices

Logout from all devices:

```graphql
mutation {
  logoutAll
}
```

**Headers required**:
```
Authorization: Bearer <access-token>
```

## Protecting Resolvers

### Using Guards

Protect a resolver with authentication:

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../modules/auth/decorators/current-user.decorator';
import { User } from '../modules/auth/entities/user.entity';

@Resolver()
export class MyResolver {
  @Query(() => String)
  @UseGuards(JwtAuthGuard)
  async protectedQuery(@CurrentUser() user: User): Promise<string> {
    return `Hello ${user.firstName}!`;
  }
}
```

### Role-Based Access Control

Protect a resolver with role requirements:

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../modules/auth/guards/roles.guard';
import { Roles } from '../modules/auth/decorators/roles.decorator';
import { UserRole } from '../modules/auth/enums/user-role.enum';
import { CurrentUser } from '../modules/auth/decorators/current-user.decorator';
import { User } from '../modules/auth/entities/user.entity';

@Resolver()
export class AdminResolver {
  @Query(() => String)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminOnlyQuery(@CurrentUser() user: User): Promise<string> {
    return `Admin access: ${user.email}`;
  }
}
```

### Multiple Roles

Allow multiple roles:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.TUTOR)
async someQuery(@CurrentUser() user: User) {
  // Accessible by ADMIN or TUTOR
}
```

## Token Lifecycle

1. **Access Token**: Short-lived (15 minutes), included in `Authorization: Bearer <token>` header
2. **Refresh Token**: Long-lived (30 days), stored securely, used to get new access tokens
3. **Token Refresh**: When access token expires, use refresh token to get new tokens
4. **Token Revocation**: Refresh tokens can be revoked on logout

## Security Features

1. **Password Hashing**: Passwords are hashed using bcrypt (12 rounds)
2. **Token Hashing**: Refresh tokens are hashed before storage
3. **Token Rotation**: New refresh tokens issued on refresh
4. **Token Revocation**: Tokens can be revoked individually or for all devices
5. **Role-Based Access**: Granular access control using roles
6. **Active User Check**: Only active users can login

## Frontend Integration

### Example: Apollo Client Setup

```typescript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: 'http://localhost:3000/api/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
```

### Example: Token Refresh Logic

```typescript
// When access token expires, refresh it
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  const response = await fetch('http://localhost:3000/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        mutation {
          refreshToken(input: { refreshToken: "${refreshToken}" }) {
            accessToken
            refreshToken
            expiresIn
          }
        }
      `,
    }),
  });
  
  const { data } = await response.json();
  localStorage.setItem('accessToken', data.refreshToken.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken.refreshToken);
  return data.refreshToken.accessToken;
}
```

## User Roles

- **TUTOR**: Tutors login with mobile number
- **STUDENT**: Students login with mobile number
- **ADMIN**: Admins login with email (admin@tutorix.com), only accessible from web

## Error Handling

Common errors:
- `401 Unauthorized`: Invalid credentials or expired token
- `403 Forbidden`: Insufficient permissions (wrong role)
- `409 Conflict`: Email or mobile already registered
- `400 Bad Request`: Missing required fields or invalid input

## Next Steps

1. Add email verification for admins
2. Add mobile verification (SMS OTP) for tutors/students
3. Implement password reset flow
4. Add rate limiting for login attempts
5. Add two-factor authentication (2FA) for admins
6. Add session management and device tracking

