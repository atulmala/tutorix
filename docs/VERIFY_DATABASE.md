# Verify and Create Database

## Quick Verification

Run this command to check if the `tutorix` database exists:

```bash
psql -U postgres -h localhost -lqt | cut -d \| -f 1 | grep -w tutorix
```

If it returns nothing, the database doesn't exist.

## Check What Database TypeORM is Actually Using

Since your API connection log shows success, let's verify what's happening:

1. **Check your `.env` file** - Make sure `DB_NAME=tutorix` is set correctly
2. **Check the connection log** - The log should show the exact database name

## Create the Database (if it doesn't exist)

If the database doesn't exist, create it using one of these methods:

### Method 1: Using psql Command Line

```bash
# Connect to PostgreSQL
psql -U postgres -h localhost

# Create the database
CREATE DATABASE tutorix;

# Verify it was created
\l

# Exit
\q
```

### Method 2: Using pgAdmin

1. **Right-click** on "Databases" in the left panel
2. Select **"Create" > "Database..."**
3. Fill in:
   - **Database**: `tutorix`
   - **Owner**: `postgres` (or your username)
4. Click **"Save"**

### Method 3: Using SQL Script

Create a file `create-db.sql`:

```sql
CREATE DATABASE tutorix
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;
```

Then run:
```bash
psql -U postgres -h localhost -f create-db.sql
```

## Verify Database Connection

After creating the database, restart your API and check the log:

```bash
npm run serve:api
```

You should see:
```
✅ Database connected successfully: tutorix@localhost:5432
```

## Troubleshooting pgAdmin Display Issue

If the database exists but doesn't show in pgAdmin 9.11:

1. **Refresh the server**: Right-click server → Refresh
2. **Disconnect and reconnect**: Right-click server → Disconnect Server, then Connect Server
3. **Check all server connections**: The database might be under a different server
4. **Clear pgAdmin cache**: Close pgAdmin, clear cache, restart
5. **Recreate server connection**: Delete and recreate the server connection in pgAdmin

See `PGADMIN_TROUBLESHOOTING.md` for detailed steps.


