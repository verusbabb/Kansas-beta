#!/bin/bash

# Run database migrations only via Cloud Build
# This bypasses IPv6 connection issues

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

echo -e "${BLUE}🚀 Running database migrations via Cloud Build...${NC}"
echo ""

# Create migration Cloud Build config (same as deploy.sh uses)
cat > /tmp/migrations-build.yaml <<EOF
steps:
  - name: 'node:20'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        cd backend
        npm ci --production=false
        # Build the backend first so we can use the compiled secret-loader
        npm run build
        # Download and start Cloud SQL proxy (TCP mode - simpler and more reliable)
        wget -q https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64 -O /tmp/cloud-sql-proxy
        chmod +x /tmp/cloud-sql-proxy
        /tmp/cloud-sql-proxy --address 127.0.0.1 --port 5432 ${PROJECT_ID}:${REGION}:${DATABASE_INSTANCE} &
        PROXY_PID=$$!
        # Wait for proxy to be ready
        echo "Waiting for Cloud SQL proxy..."
        for i in {1..30}; do
          if nc -z 127.0.0.1 5432 2>/dev/null; then
            echo "✓ Cloud SQL proxy ready!"
            break
          fi
          sleep 1
        done
        # Use the migration script that handles secret loading
        echo "Running migrations..."
        node scripts/run-migrations.js
        # Clean up
        kill $$PROXY_PID 2>/dev/null || true
    env:
      - 'NODE_ENV=production'
      - 'DATABASE_HOST=127.0.0.1'
      - 'DATABASE_PORT=5432'
      - 'DATABASE_NAME=${DATABASE_NAME}'
      - 'DATABASE_USER=postgres'
      - 'GCP_SECRET_MANAGER_ENABLED=true'
      - 'GCP_PROJECT_ID=${PROJECT_ID}'
    secretEnv: ['DATABASE_PASSWORD']
    id: 'run-migrations'

availableSecrets:
  secretManager:
    - versionName: projects/${PROJECT_ID}/secrets/database-password/versions/latest
      env: 'DATABASE_PASSWORD'

options:
  machineType: 'E2_HIGHCPU_8'
  logging: CLOUD_LOGGING_ONLY

timeout: '600s'
EOF

echo -e "${BLUE}📦 Submitting migration job to Cloud Build...${NC}"
echo -e "${YELLOW}⚠️  Note: Ensure Cloud Build service account has Cloud SQL Client role${NC}"
echo -e "${YELLOW}   Run: gcloud projects add-iam-policy-binding ${PROJECT_ID} --member=serviceAccount:\$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')@cloudbuild.gserviceaccount.com --role=roles/cloudsql.client${NC}"
echo ""
gcloud builds submit --config=/tmp/migrations-build.yaml --project ${PROJECT_ID}
rm -f /tmp/migrations-build.yaml

echo ""
echo -e "${GREEN}✅ Migrations completed!${NC}"
echo ""
echo -e "${BLUE}💡 You can now test the /newsletters endpoint.${NC}"

