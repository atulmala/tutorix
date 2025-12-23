# AWS Secrets Manager Integration

## Overview

The Tutorix API supports loading database credentials from AWS Secrets Manager in production environments, while using `.env` files for development and staging.

## How It Works

### Development & Staging
- **Source**: `.env` file
- **Loading**: Automatic via `dotenv`
- **No AWS SDK required**

### Production
- **Source**: AWS Secrets Manager
- **Loading**: Automatic via `@aws-sdk/client-secrets-manager`
- **Requires**: AWS credentials configured (IAM role, credentials file, or environment variables)

## Configuration

### Environment Variables

#### Required for All Environments
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tutorix
```

#### Development/Staging (.env file)
```env
DB_USERNAME=postgres
DB_PASSWORD=your_password
```

#### Production (AWS Secrets Manager)
```env
NODE_ENV=production
AWS_SECRET_NAME=tutorix/production/database  # Optional, defaults to this
AWS_REGION=us-east-1                          # Optional, defaults to us-east-1
```

### AWS Secrets Manager Secret Format

The secret in AWS Secrets Manager should be stored as a JSON string with the following structure:

```json
{
  "DB_USERNAME": "postgres",
  "DB_PASSWORD": "your_secure_password",
  "DB_HOST": "your-db-host.rds.amazonaws.com",
  "DB_PORT": "5432",
  "DB_NAME": "tutorix"
}
```

**Alternative field names** (also supported):
```json
{
  "username": "postgres",
  "password": "your_secure_password",
  "host": "your-db-host.rds.amazonaws.com",
  "port": "5432",
  "database": "tutorix"
}
```

## Setting Up AWS Secrets Manager

### 1. Create the Secret

```bash
aws secretsmanager create-secret \
  --name tutorix/production/database \
  --description "Database credentials for Tutorix production" \
  --secret-string '{"DB_USERNAME":"postgres","DB_PASSWORD":"secure_password","DB_HOST":"db.example.com","DB_PORT":"5432","DB_NAME":"tutorix"}' \
  --region us-east-1
```

### 2. Configure IAM Permissions

Your application needs permission to read the secret. Attach this policy to your IAM role/user:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:tutorix/production/database-*"
    }
  ]
}
```

### 3. AWS Credentials

The application will use AWS credentials in this order:
1. **IAM Role** (if running on EC2/ECS/Lambda) - Recommended for production
2. **Environment Variables**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
3. **Credentials File**: `~/.aws/credentials`
4. **Instance Metadata** (for EC2 instances)

## Usage

### Application Startup (NestJS)

The application automatically loads credentials based on `NODE_ENV`:

```typescript
// In database.module.ts - automatically handles credential loading
TypeOrmModule.forRootAsync({
  useFactory: async () => {
    const credentials = await loadDatabaseCredentials();
    // ... uses credentials
  },
})
```

### Running Migrations

#### Development/Staging
```bash
# Uses .env file automatically
npm run migration:run
```

#### Production

**Option 1: Pre-set Environment Variables** (Recommended)
```bash
# Load secrets and set as environment variables
export $(aws secretsmanager get-secret-value \
  --secret-id tutorix/production/database \
  --query SecretString \
  --output text | jq -r 'to_entries|map("\(.key)=\(.value)")|.[]')

# Run migration
npm run migration:run
```

**Option 2: Use a Migration Script**
Create a script that loads secrets before running migrations:

```bash
#!/bin/bash
# scripts/migrate-production.sh

# Load secrets from AWS
SECRET=$(aws secretsmanager get-secret-value \
  --secret-id tutorix/production/database \
  --query SecretString \
  --output text)

# Parse and export
export DB_USERNAME=$(echo $SECRET | jq -r '.DB_USERNAME')
export DB_PASSWORD=$(echo $SECRET | jq -r '.DB_PASSWORD')
export DB_HOST=$(echo $SECRET | jq -r '.DB_HOST')
export DB_PORT=$(echo $SECRET | jq -r '.DB_PORT')
export DB_NAME=$(echo $SECRET | jq -r '.DB_NAME')

# Run migration
npm run migration:run
```

## Code Structure

### Files

- **`apps/api/src/app/database/database-credentials.loader.ts`**
  - Contains `loadDatabaseCredentials()` function
  - Handles environment-based credential loading

- **`apps/api/src/app/database/database.config.ts`**
  - Creates TypeORM options from credentials
  - Shared by both NestJS app and CLI

- **`apps/api/src/app/database/database.module.ts`**
  - NestJS module configuration
  - Uses async credential loading

- **`apps/api/src/data-source.ts`**
  - TypeORM CLI configuration
  - Uses synchronous .env loading (for CLI compatibility)

## Security Best Practices

### ✅ DO:
- Use IAM roles for production (not access keys)
- Rotate secrets regularly
- Use different secrets for each environment
- Limit IAM permissions to specific secrets
- Enable CloudTrail for audit logging
- Use VPC endpoints for Secrets Manager (if in VPC)

### ❌ DON'T:
- Store AWS credentials in code or .env files
- Use the same secret across environments
- Grant broader permissions than necessary
- Log secret values
- Commit secrets to version control

## Troubleshooting

### Error: "Failed to load database credentials from AWS Secrets Manager"

**Possible causes:**
1. AWS credentials not configured
2. IAM permissions insufficient
3. Secret name incorrect
4. Region mismatch

**Solutions:**
- Verify AWS credentials: `aws sts get-caller-identity`
- Check IAM permissions
- Verify secret name matches `AWS_SECRET_NAME` env var
- Ensure region matches secret location

### Error: "Secret does not contain a SecretString"

**Solution:**
- Ensure the secret is stored as a JSON string, not binary
- Check secret format matches expected structure

### Migrations Fail in Production

**Solution:**
- Ensure environment variables are set before running migrations
- Use the migration script approach (Option 2 above)
- Or run migrations as part of deployment pipeline that loads secrets

## Testing

### Local Testing with AWS Secrets Manager

```bash
# Set AWS credentials
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
export AWS_REGION=us-east-1

# Set production mode
export NODE_ENV=production
export AWS_SECRET_NAME=tutorix/production/database

# Run application
npm run serve:api
```

## Related Documentation

- [SECURITY.md](../SECURITY.md) - General security best practices
- [MIGRATIONS_GUIDE.md](./MIGRATIONS_GUIDE.md) - Migration workflow
- [AWS Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/)

