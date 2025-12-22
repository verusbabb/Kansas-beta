# Backend .env File Setup Guide

## For Local Development

Create or update `backend/.env` with these values:

```env
# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database (Local PostgreSQL)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=kansas_beta
DATABASE_USER=postgres
DATABASE_PASSWORD=your_local_database_password

# GCP Secret Manager (disabled for local dev)
GCP_SECRET_MANAGER_ENABLED=false
GCP_PROJECT_ID=verusware

# JWT (for future use)
JWT_SECRET=your-local-jwt-secret-key
JWT_EXPIRES_IN=1d
```

## Important Notes

### Local Development
- **DATABASE_HOST**: Use `localhost` for local PostgreSQL
- **DATABASE_PASSWORD**: Use your local PostgreSQL password
- **GCP_SECRET_MANAGER_ENABLED**: Set to `false` (uses .env file)
- **GCP_PROJECT_ID**: Set to `verusware` (for when you test Secret Manager)

### Production (Cloud Run)
- Environment variables are set by Cloud Run (see `deploy.sh`)
- Sensitive values (like DATABASE_PASSWORD) come from Secret Manager
- **GCP_SECRET_MANAGER_ENABLED**: Set to `true` in production
- **DATABASE_HOST**: Uses Cloud SQL socket path: `/cloudsql/verusware:us-central1:kansas-beta-db`

## Setting Up Local Database

1. **Install PostgreSQL locally** (if not already installed)

2. **Create the database:**
   ```bash
   createdb kansas_beta
   ```

3. **Or using psql:**
   ```bash
   psql -U postgres
   CREATE DATABASE kansas_beta;
   \q
   ```

4. **Update .env with your local PostgreSQL password**

5. **Run migrations:**
   ```bash
   cd backend
   npm run migration:run:dev
   ```

## Using Cloud SQL for Local Development (Optional)

If you want to connect to Cloud SQL from your local machine:

1. **Install Cloud SQL Proxy:**
   ```bash
   # macOS
   brew install cloud-sql-proxy
   
   # Or download from:
   # https://cloud.google.com/sql/docs/postgres/sql-proxy
   ```

2. **Start the proxy:**
   ```bash
   cloud_sql_proxy -instances=verusware:us-central1:kansas-beta-db=tcp:5432
   ```

3. **Update .env:**
   ```env
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   # Rest stays the same
   ```

## Production Configuration

In production (Cloud Run), these are set automatically by `deploy.sh`:

- `NODE_ENV=production`
- `GCP_SECRET_MANAGER_ENABLED=true`
- `GCP_PROJECT_ID=verusware`
- `DATABASE_HOST=/cloudsql/verusware:us-central1:kansas-beta-db`
- `DATABASE_NAME=kansas_beta`
- `DATABASE_USER=postgres`
- `DATABASE_PASSWORD` comes from Secret Manager

## Security Notes

⚠️ **Never commit .env to git!** It's already in `.gitignore`

✅ **For production secrets:**
- Store in GCP Secret Manager
- Never hardcode in .env or code
- Use Secret Manager integration (already configured)

## Quick Setup

1. Copy the example:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Edit `.env` and update:
   - `DATABASE_PASSWORD` (your local PostgreSQL password)
   - `JWT_SECRET` (generate a random string)

3. Start the backend:
   ```bash
   npm run start:dev
   ```

