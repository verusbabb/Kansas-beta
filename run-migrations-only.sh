#!/bin/bash

# Run database migrations only (without full deployment)
# This uses Cloud Build to run just the migration step

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PROJECT_ID="verusware"
REGION="us-central1"
DATABASE_INSTANCE="kansas-beta-db"
DATABASE_NAME="kansas_beta"

echo -e "${BLUE}🚀 Running database migrations...${NC}"
echo ""

# Create a temporary cloudbuild file that only runs migrations
# Note: We need at least 2 steps to use a volume, so we'll add a dummy step
cat > /tmp/migrations-only.yaml <<EOF
steps:
  # Dummy step to satisfy Cloud Build volume requirement
  - name: 'gcr.io/cloud-builders/gcloud'
    entrypoint: 'bash'
    args:
      - '-c'
      - 'echo "Starting migrations..."'
    volumes:
      - name: 'cloudsql'
        path: /cloudsql
    id: 'setup'
  
  # Migration step
  - name: 'node:20'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        cd backend
        npm ci --production=false
        npm run migration:run
    env:
      - 'NODE_ENV=production'
      - 'DATABASE_HOST=/cloudsql/\$PROJECT_ID:us-central1:${DATABASE_INSTANCE}'
      - 'DATABASE_NAME=${DATABASE_NAME}'
      - 'DATABASE_USER=postgres'
      - 'GCP_SECRET_MANAGER_ENABLED=true'
      - 'GCP_PROJECT_ID=\$PROJECT_ID'
    volumes:
      - name: 'cloudsql'
        path: /cloudsql
    waitFor: ['setup']
    id: 'run-migrations'

options:
  machineType: 'E2_HIGHCPU_8'
  logging: CLOUD_LOGGING_ONLY

timeout: '600s'
EOF

echo -e "${BLUE}📦 Submitting migration job to Cloud Build...${NC}"
gcloud builds submit --config=/tmp/migrations-only.yaml --project ${PROJECT_ID}

# Clean up
rm -f /tmp/migrations-only.yaml

echo ""
echo -e "${GREEN}✅ Migrations completed!${NC}"
echo ""
echo -e "${BLUE}💡 You can now test the /newsletters endpoint.${NC}"

