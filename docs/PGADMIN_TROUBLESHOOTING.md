# pgAdmin Troubleshooting Guide

## Issue: Database Not Showing in pgAdmin 9.11

If your database connection is working (confirmed by API logs) but the database doesn't appear in pgAdmin, try these solutions:

## Solution 1: Refresh the Server Connection

1. **Right-click** on your PostgreSQL server in the left panel
2. Select **"Refresh"** or **"Reload"**
3. Wait a few seconds for the refresh to complete
4. Expand the **"Databases"** folder to see if `tutorix` appears

## Solution 2: Disconnect and Reconnect

1. **Right-click** on your PostgreSQL server
2. Select **"Disconnect Server"**
3. Wait a moment
4. **Right-click** again and select **"Connect Server"**
5. Enter your password if prompted
6. Expand **"Databases"** to check

## Solution 3: Check Server Connection Settings

1. **Right-click** on your PostgreSQL server
2. Select **"Properties"**
3. Verify:
   - **Host**: `localhost` (or `127.0.0.1`)
   - **Port**: `5432`
   - **Maintenance database**: `postgres` (default)
   - **Username**: `postgres` (or your username)
4. Click **"Save"** if you made changes
5. Reconnect and refresh

## Solution 4: Clear pgAdmin Cache

pgAdmin 9.11 may have cached the old database list. Try:

1. **Close pgAdmin completely**
2. **Clear pgAdmin cache** (location depends on OS):
   - **macOS**: `~/Library/Application Support/pgAdmin/`
   - **Windows**: `%APPDATA%\pgAdmin\`
   - **Linux**: `~/.pgadmin/`
3. **Restart pgAdmin**
4. **Reconnect** to your server

## Solution 5: Verify Database Exists via Command Line

You can verify the database exists using `psql`:

```bash
# Connect to PostgreSQL
psql -U postgres -h localhost

# List all databases
\l

# Or list databases with a query
SELECT datname FROM pg_database WHERE datname = 'tutorix';

# Connect to tutorix database
\c tutorix

# Exit
\q
```

## Solution 6: Check Database Permissions

The database might exist but not be visible due to permissions:

```sql
-- Connect as postgres superuser
psql -U postgres -h localhost

-- Check if database exists
SELECT datname, datacl FROM pg_database WHERE datname = 'tutorix';

-- Grant permissions if needed (replace 'your_username' with actual username)
GRANT ALL PRIVILEGES ON DATABASE tutorix TO your_username;
```

## Solution 7: Check if Database is in Different Server Group

1. In pgAdmin, check if you have **multiple server connections**
2. The database might be under a **different server** in the left panel
3. Expand all server connections to find it

## Solution 8: Recreate pgAdmin Server Connection

If nothing else works:

1. **Right-click** on your server connection
2. Select **"Delete Server"** (this only removes the connection, not the database)
3. **Right-click** on "Servers" in the left panel
4. Select **"Create" > "Server..."**
5. Fill in:
   - **Name**: `PostgreSQL` (or any name)
   - **Host**: `localhost`
   - **Port**: `5432`
   - **Maintenance database**: `postgres`
   - **Username**: `postgres`
   - **Password**: Your PostgreSQL password
6. Click **"Save"**
7. Expand **"Databases"** - the `tutorix` database should now appear

## Solution 9: Verify via API Connection Log

Since your API is connecting successfully, the database definitely exists. The log message:
```
✅ Database connected successfully: tutorix@localhost:5432
```

This confirms:
- Database `tutorix` exists
- Connection credentials are correct
- PostgreSQL server is running

The issue is purely with pgAdmin's UI not displaying it.

## Solution 10: Use Alternative Tools

If pgAdmin continues to have issues, you can use:

1. **psql** (command-line tool) - Already installed with PostgreSQL
2. **DBeaver** - Free, cross-platform database tool
3. **TablePlus** - Modern database GUI (macOS/Windows)
4. **pgweb** - Web-based PostgreSQL browser

## Quick Verification Command

Run this to verify the database exists and is accessible:

```bash
psql -U postgres -h localhost -d tutorix -c "SELECT current_database();"
```

If this works, the database exists and is accessible. The issue is only with pgAdmin's display.

## Still Not Working?

If none of these solutions work:

1. **Check PostgreSQL logs** for any errors:
   - **macOS**: `/usr/local/var/log/postgresql.log` or check via Homebrew
   - **Linux**: `/var/log/postgresql/`
   - **Windows**: Check Event Viewer

2. **Verify PostgreSQL version compatibility** with pgAdmin 9.11

3. **Report the issue** to pgAdmin if it's a bug in version 9.11


