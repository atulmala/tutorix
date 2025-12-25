# Testing Authentication

This guide shows you how to test the authentication system using GraphQL Playground.

## Prerequisites

1. **Start the API server:**
   ```bash
   npm run serve:api
   ```

2. **Open GraphQL Playground:**
   - Navigate to: `http://localhost:3000/api/graphql`
   - This is an interactive GraphQL IDE where you can test queries and mutations

## Step 1: Register a User

### Register an Admin User

```graphql
mutation {
  register(input: {
    role: ADMIN
    email: "admin@tutorix.com"
    password: "Admin123!@#"
    firstName: "Admin"
    lastName: "User"
  }) {
    accessToken
    refreshToken
    expiresIn
    user {
      id
      email
      role
      firstName
      lastName
    }
  }
}
```

### Register a Tutor User

```graphql
mutation {
  register(input: {
    role: TUTOR
    mobile: "+1234567890"
    password: "Tutor123!@#"
    firstName: "John"
    lastName: "Tutor"
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

### Register a Student User

```graphql
mutation {
  register(input: {
    role: STUDENT
    mobile: "+1987654321"
    password: "Student123!@#"
    firstName: "Jane"
    lastName: "Student"
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

## Step 2: Login

### Login as Admin (using email)

```graphql
mutation {
  login(input: {
    loginId: "admin@tutorix.com"
    password: "Admin123!@#"
  }) {
    accessToken
    refreshToken
    expiresIn
    user {
      id
      email
      role
      firstName
      lastName
    }
  }
}
```

### Login as Tutor/Student (using mobile)

```graphql
mutation {
  login(input: {
    loginId: "+1234567890"
    password: "Tutor123!@#"
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

## Step 3: Test Protected Query

After logging in, copy the `accessToken` from the response.

### Set Authorization Header in GraphQL Playground

1. In GraphQL Playground, look for the **HTTP HEADERS** section at the bottom
2. Add the following:

```json
{
  "Authorization": "Bearer YOUR_ACCESS_TOKEN_HERE"
}
```

Replace `YOUR_ACCESS_TOKEN_HERE` with the actual access token from the login response.

### Test the `me` Query

```graphql
query {
  me {
    id
    email
    mobile
    role
    firstName
    lastName
    isEmailVerified
    isMobileVerified
    createdDate
  }
}
```

This query requires authentication. If the token is valid, you'll get the current user's information.

## Step 4: Test Refresh Token

```graphql
mutation {
  refreshToken(input: {
    refreshToken: "YOUR_REFRESH_TOKEN_HERE"
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

Replace `YOUR_REFRESH_TOKEN_HERE` with the refresh token from the login response.

## Step 5: Test Logout

First, set the Authorization header with a valid access token, then:

```graphql
mutation {
  logout(refreshToken: "YOUR_REFRESH_TOKEN_HERE")
}
```

## Complete Test Flow

### 1. Register Admin
```graphql
mutation RegisterAdmin {
  register(input: {
    role: ADMIN
    email: "admin@tutorix.com"
    password: "Admin123!@#"
    firstName: "Admin"
    lastName: "User"
  }) {
    accessToken
    refreshToken
    user {
      id
      email
      role
    }
  }
}
```

### 2. Login Admin (if already registered)
```graphql
mutation LoginAdmin {
  login(input: {
    loginId: "admin@tutorix.com"
    password: "Admin123!@#"
  }) {
    accessToken
    refreshToken
    user {
      id
      email
      role
    }
  }
}
```

### 3. Get Current User (requires auth header)
```graphql
query GetMe {
  me {
    id
    email
    role
    firstName
    lastName
  }
}
```

**Remember to add the Authorization header:**
```json
{
  "Authorization": "Bearer YOUR_ACCESS_TOKEN"
}
```

## Testing with cURL

You can also test using cURL commands:

### Register
```bash
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { register(input: { role: ADMIN, email: \"admin@tutorix.com\", password: \"Admin123!@#\", firstName: \"Admin\", lastName: \"User\" }) { accessToken refreshToken user { id email role } } }"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { login(input: { loginId: \"admin@tutorix.com\", password: \"Admin123!@#\" }) { accessToken refreshToken user { id email role } } }"
  }'
```

### Get Current User (with token)
```bash
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -d '{
    "query": "query { me { id email role firstName lastName } }"
  }'
```

## Common Issues

### 1. "Invalid login credentials"
- Check that the user exists (register first)
- Verify the password is correct
- For admins, use email; for tutors/students, use mobile number

### 2. "Unauthorized" when calling `me`
- Make sure you've added the Authorization header
- Check that the token hasn't expired (15 minutes)
- Verify the token format: `Bearer YOUR_TOKEN`

### 3. "User not found or inactive"
- The user might be inactive
- Check the database to verify user status

## Next Steps

Once authentication is working:
1. Test role-based access control
2. Test token refresh flow
3. Test logout functionality
4. Integrate with your frontend application

