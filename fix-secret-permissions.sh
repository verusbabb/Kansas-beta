#!/bin/bash

# Fix Secret Manager permissions for Cloud Run

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ID="verusware"
SERVICE_NAME="kansas-beta-backend"

echo -e "${BLUE}🔧 Fixing Secret Manager permissions for Cloud Run...${NC}"
echo ""

# Get the Cloud Run service account
echo -e "${BLUE}Getting Cloud Run service account...${NC}"
SERVICE_ACCOUNT=$(gcloud run services describe ${SERVICE_NAME} \
  --region us-central1 \
  --project ${PROJECT_ID} \
  --format="value(spec.template.spec.serviceAccountName)" 2>/dev/null)

if [ -z "$SERVICE_ACCOUNT" ] || [ "$SERVICE_ACCOUNT" = "default" ] || [ "$SERVICE_ACCOUNT" = "" ]; then
  # Use the default compute service account
  PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")
  SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
  echo -e "${YELLOW}Using default compute service account: ${SERVICE_ACCOUNT}${NC}"
else
  echo -e "${GREEN}Found service account: ${SERVICE_ACCOUNT}${NC}"
fi

echo ""

# Grant Secret Manager access
echo -e "${BLUE}Granting Secret Manager access...${NC}"
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

echo ""
echo -e "${GREEN}✅ Permissions granted!${NC}"
echo ""
echo -e "${BLUE}Now redeploy the backend:${NC}"
echo -e "${BLUE}  ./deploy.sh backend${NC}"

