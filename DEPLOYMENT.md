# Deployment Guide

This document explains how to deploy the Kansas Beta application to Google Cloud Platform.

## Prerequisites

1. Google Cloud Platform account
2. `gcloud` CLI installed and authenticated
3. GCP project created (default: `verusware`)
4. Initial setup completed (run `./setup-gcp.sh` if needed)

## Quick Start

### Full Deployment (Recommended)

Deploy everything in the correct order:

```bash
./deploy.sh all
```

This will:
1. Build backend Docker image
2. Push backend image
3. Run database migrations
4. Run database seeders
5. Deploy backend to Cloud Run
6. Build frontend Docker image (with proper API URL and Auth0 config)
7. Push frontend image
8. Deploy frontend to Cloud Run

### Individual Operations

#### Deploy Backend Only

```bash
./deploy.sh backend
```

#### Deploy Frontend Only

```bash
./deploy.sh frontend
```

#### Run Migrations Only

```bash
./deploy.sh migrations
```

#### Run Seeders Only

```bash
./deploy.sh seeders
```

## How It Works

### Architecture

- **`cloudbuild.yaml`** - Single source of truth for all build and deployment steps
- **`deploy.sh`** - Wrapper script that:
  - Fetches backend URL from Cloud Run
  - Fetches Auth0 secrets from Secret Manager
  - Passes substitutions to Cloud Build
  - Can target specific build steps with `--only` flag

### Secrets Management

All secrets are stored in GCP Secret Manager:

- `database-password` - Database password (automatically injected)
- `auth0-domain` - Auth0 domain for frontend
- `auth0-client-id` - Auth0 client ID for frontend
- `auth0-audience` - Auth0 API audience

The `deploy.sh` script automatically fetches Auth0 secrets and passes them as build arguments to the frontend build.

### Database Operations

- **Migrations**: Create/update database schema (runs via Cloud SQL Proxy in Cloud Build)
- **Seeders**: Populate initial data (e.g., admin user - idempotent, safe to run multiple times)

Both operations use Cloud SQL Proxy for secure database connections in Cloud Build.

## Troubleshooting

### Frontend shows "VITE_API_URL is required" error

This means the backend URL wasn't found. Make sure:
1. Backend is deployed first (`./deploy.sh backend`)
2. Backend service exists in Cloud Run
3. The service name matches `kansas-beta-backend`

### Migrations fail

1. Check Cloud Build logs for the `run-migrations` step
2. Verify `database-password` secret exists in Secret Manager
3. Verify Cloud Build service account has `roles/cloudsql.client` permission

### Auth0 login doesn't work

1. Verify Auth0 secrets exist in Secret Manager:
   ```bash
   gcloud secrets list --project=verusware | grep auth0
   ```
2. Check frontend build logs to ensure secrets were passed correctly
3. Verify Auth0 Action is configured (see `AUTH0_ACTION_SETUP.md`)

## Manual Operations

### View Logs

```bash
# Backend logs
gcloud run services logs read kansas-beta-backend --region us-central1

# Frontend logs
gcloud run services logs read kansas-beta-frontend --region us-central1

# Cloud Build logs
gcloud builds list --limit=10
gcloud builds log <BUILD_ID>
```

### Get Service URLs

```bash
# Backend URL
gcloud run services describe kansas-beta-backend \
  --region us-central1 \
  --format="value(status.url)"

# Frontend URL
gcloud run services describe kansas-beta-frontend \
  --region us-central1 \
  --format="value(status.url)"
```

## Files Overview

- **`deploy.sh`** - Main deployment script (use this for all deployments)
- **`cloudbuild.yaml`** - Cloud Build configuration (all build/deploy steps)
- **`setup-gcp.sh`** - Initial GCP setup (run once for new projects)
- **`backend/scripts/run-migrations.js`** - Migration runner (used by Cloud Build)
- **`backend/scripts/run-seeders.js`** - Seeder runner (used by Cloud Build)

## Best Practices

1. **Always run migrations before deploying** when schema changes exist
2. **Run seeders after migrations** to populate initial data
3. **Deploy backend before frontend** to ensure API URL is available
4. **Use `./deploy.sh all`** for full deployments to ensure correct order
5. **Check logs** if anything fails to understand the issue

## Common Workflows

### After creating a new migration

```bash
# Run migrations
./deploy.sh migrations

# Then deploy backend
./deploy.sh backend
```

### After frontend changes only

```bash
./deploy.sh frontend
```

### After backend changes only

```bash
./deploy.sh backend
```

### First-time deployment

```bash
# Run full deployment (includes migrations and seeders)
./deploy.sh all
```

