#!/bin/bash
# Grant Cloud SQL Client role to Cloud Build service account

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PROJECT_ID="verusware"

echo -e "${BLUE}🚀 Granting Cloud SQL Client role to Cloud Build service account...${NC}"

# Get the project number
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format="value(projectNumber)")
if [ -z "${PROJECT_NUMBER}" ]; then
  echo -e "${RED}❌ Failed to get project number for project ${PROJECT_ID}. Exiting.${NC}"
  exit 1
fi

# Cloud Build service account format: PROJECT_NUMBER@cloudbuild.gserviceaccount.com
SERVICE_ACCOUNT="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

echo -e "${BLUE}  Project ID: ${PROJECT_ID}${NC}"
echo -e "${BLUE}  Project Number: ${PROJECT_NUMBER}${NC}"
echo -e "${BLUE}  Service Account: ${SERVICE_ACCOUNT}${NC}"

# Grant the Cloud SQL Client role
echo -e "${BLUE}  Granting roles/cloudsql.client to ${SERVICE_ACCOUNT}...${NC}"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudsql.client" \
  --project="${PROJECT_ID}"

echo ""
echo -e "${GREEN}✅ Cloud SQL Client role granted successfully!${NC}"
echo ""
echo -e "${YELLOW}💡 You can now run migrations:${NC}"
echo -e "${YELLOW}   ./run-migration-only.sh${NC}"

