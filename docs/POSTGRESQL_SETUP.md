# PostgreSQL Database Setup Guide

## Prerequisites

1. **PostgreSQL installed** on your system
   - Download from: https://www.postgresql.org/download/
   - Or use Homebrew on macOS: `brew install postgresql@15`

2. **pgAdmin installed**
   - Download from: https://www.pgadmin.org/download/
   - Or use Homebrew on macOS: `brew install --cask pgadmin4`

## Step-by-Step: Creating Database in pgAdmin

### Step 1: Launch pgAdmin

1. Open pgAdmin 4 from your applications
2. You'll be prompted to set a master password (first time only)
3. The pgAdmin interface will open in your browser (usually `http://127.0.0.1:5050`)

### Step 2: Connect to PostgreSQL Server

1. In the left sidebar, expand **Servers**
2. If you see your PostgreSQL server (e.g., "PostgreSQL 15"), expand it
3. If not connected:
   - Right-click on **Servers** → **Create** → **Server**
   - **General Tab**:
     - Name: `Local PostgreSQL` (or any name you prefer)
   - **Connection Tab**:
     - Host name/address: `localhost` (or `127.0.0.1`)
     - Port: `5432` (default PostgreSQL port)
     - Maintenance database: `postgres`
     - Username: `postgres` (default, or your PostgreSQL username)
     - Password: Enter your PostgreSQL password
     - Check "Save password" if you want
   - Click **Save**

### Step 3: Create a New Database

1. Expand your PostgreSQL server in the left sidebar
2. Right-click on **Databases** → **Create** → **Database**

3. **General Tab**:
   - **Database name**: `tutorix` (or your preferred name)
   - **Owner**: `postgres` (default, or your username)
   - **Comment** (optional): "Tutorix application database"

4. **Definition Tab** (optional):
   - **Template**: `template0` (recommended for clean database)
   - **Encoding**: `UTF8` (default, recommended)
   - **Collation**: `en_US.UTF-8` (or your locale)
   - **Character type**: `en_US.UTF-8` (or your locale)

5. **Parameters Tab** (optional):
   - You can leave defaults or set custom parameters if needed

6. Click **Save**

### Step 4: Verify Database Creation

1. Expand **Databases** in the left sidebar
2. You should see your new `tutorix` database
3. Expand it to see:
   - Schemas
   - Tables (empty initially)
   - Other database objects

### Step 5: Create a Database User (Optional but Recommended)

For better security, create a dedicated user for your application:

1. Expand your PostgreSQL server
2. Expand **Login/Group Roles**
3. Right-click → **Create** → **Login/Group Role**

4. **General Tab**:
   - **Name**: `tutorix_user` (or your preferred name)
   - Check **Can login?**: Yes

5. **Definition Tab**:
   - **Password**: Enter a strong password
   - **Password expiration**: Leave blank (or set as needed)

6. **Privileges Tab**:
   - Check **Can login?**: Yes
   - Check **Create databases?**: No (unless needed)
   - Check **Create roles?**: No (unless needed)

7. **Membership Tab** (optional):
   - You can add the user to groups if needed

8. Click **Save**

### Step 6: Grant Permissions to User

1. Right-click on your `tutorix` database → **Properties**
2. Go to **Security** tab
3. Click **+** to add a new privilege
4. Select your `tutorix_user` from the Grantee dropdown
5. Check all privileges:
   - ✅ ALL
   - Or individually: CONNECT, CREATE, TEMPORARY
6. Click **Save**

Alternatively, you can run this SQL query:
```sql
GRANT ALL PRIVILEGES ON DATABASE tutorix TO tutorix_user;
```

### Step 7: Test Connection

1. Right-click on your `tutorix` database → **Query Tool**
2. Run a simple query:
   ```sql
   SELECT version();
   ```
3. If it returns PostgreSQL version, your database is ready!

## Connection Information Summary

After setup, you'll have:

- **Host**: `localhost` (or `127.0.0.1`)
- **Port**: `5432`
- **Database**: `tutorix`
- **Username**: `postgres` (or `tutorix_user` if you created one)
- **Password**: Your PostgreSQL password

## Connection String Format

For TypeORM, you'll use a connection string like:
```
postgresql://username:password@localhost:5432/tutorix
```

Or separate parameters:
- Host: `localhost`
- Port: `5432`
- Database: `tutorix`
- Username: `postgres` (or your user)
- Password: Your password

## Troubleshooting

### Can't connect to server?
- Make sure PostgreSQL service is running:
  ```bash
  # macOS (Homebrew)
  brew services start postgresql@15
  
  # Linux
  sudo systemctl start postgresql
  
  # Windows
  # Check Services → PostgreSQL
  ```

### "Password authentication failed"?
- Reset PostgreSQL password:
  ```bash
  # macOS/Linux
  psql postgres
  ALTER USER postgres WITH PASSWORD 'newpassword';
  ```

### Port 5432 already in use?
- Check what's using it:
  ```bash
  lsof -i :5432
  ```
- Or change PostgreSQL port in `postgresql.conf`

## Next Steps

Once your database is created, we'll:
1. Install TypeORM and PostgreSQL driver
2. Configure database connection
3. Set up entities and migrations
4. Connect it to your NestJS application

