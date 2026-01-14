# Testing the `user(id: ID!)` Query in GraphQL Playground

## Access GraphQL Playground
1. Make sure your API server is running: `nx serve api`
2. Open GraphQL Playground in your browser: **http://localhost:3000/api/graphql**

## Test Query

### Basic Query - Get User by ID
```graphql
query GetUserById {
  user(id: "1") {
    id
    email
    mobileCountryCode
    mobileNumber
    firstName
    lastName
    gender
    role
    isSignupComplete
    isEmailVerified
    isMobileVerified
    createdDate
    updatedDate
  }
}
```

### Query with Variables (Recommended)
```graphql
query GetUserById($id: ID!) {
  user(id: $id) {
    id
    email
    mobileCountryCode
    mobileNumber
    firstName
    lastName
    gender
    role
    isSignupComplete
    isEmailVerified
    isMobileVerified
    createdDate
    updatedDate
  }
}
```

**Variables (bottom panel of Playground):**
```json
{
  "id": "1"
}
```

### Test with Invalid ID (should return null)
```graphql
query GetUserById($id: ID!) {
  user(id: $id) {
    id
    email
    mobileNumber
  }
}
```

**Variables:**
```json
{
  "id": "99999"
}
```

### Test with Invalid Format (non-numeric)
```graphql
query GetUserById {
  user(id: "invalid") {
    id
    email
  }
}
```
*Note: This should return `null` since the resolver validates that the ID is numeric.*

## Finding a User ID to Test With

If you don't know a user ID, you can:

1. **Check your database directly:**
   ```sql
   SELECT id, email, mobile_number, first_name, last_name 
   FROM users 
   LIMIT 5;
   ```

2. **Use a user ID from a previous signup/login attempt** (check the error response or logs)

3. **Create a test user first** using the `userSignup` or `registerUser` mutation, then use the returned user ID

## Expected Response

### Success Response (User Found)
```json
{
  "data": {
    "user": {
      "id": "1",
      "email": "test@example.com",
      "mobileCountryCode": "+91",
      "mobileNumber": "9876543210",
      "firstName": "John",
      "lastName": "Doe",
      "gender": "male",
      "role": "STUDENT",
      "isSignupComplete": false,
      "isEmailVerified": false,
      "isMobileVerified": false,
      "createdDate": "2024-01-01T00:00:00.000Z",
      "updatedDate": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### Response (User Not Found)
```json
{
  "data": {
    "user": null
  }
}
```

## Notes

- The query does **not require authentication** (no `@UseGuards(JwtAuthGuard)`)
- This is intentional - it's used for resuming incomplete signups where users aren't authenticated yet
- The query returns `null` if:
  - The user ID doesn't exist
  - The ID format is invalid (non-numeric)
- All user fields are returned (no filtering based on authentication)
