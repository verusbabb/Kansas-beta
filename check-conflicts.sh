#!/bin/bash

# Check for naming conflicts in an existing GCP project
# Usage: ./check-conflicts.sh [PROJECT_ID]

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${1:-kansas-beta}"
REGION="us-central1"
DATABASE_INSTANCE="kansas-beta-db"
DATABASE_NAME="kansas_beta"
SERVICE_BACKEND="kansas-beta-backend"
SERVICE_FRONTEND="kansas-beta-frontend"

echo -e "${BLUE}🔍 Checking for naming conflicts in project: ${PROJECT_ID}${NC}"
echo ""

# Check if project exists
if ! gcloud projects describe ${PROJECT_ID} &>/dev/null; then
  echo -e "${YELLOW}⚠️  Project ${PROJECT_ID} does not exist. No conflicts possible.${NC}"
  exit 0
fi

# Set project
gcloud config set project ${PROJECT_ID} &>/dev/null

# Show existing services for context
echo -e "${BLUE}Existing Cloud Run services in this project:${NC}"
EXISTING_SERVICES=$(gcloud run services list --region ${REGION} --format="value(metadata.name)" 2>/dev/null || echo "")
if [ -n "$EXISTING_SERVICES" ]; then
  echo "$EXISTING_SERVICES" | while read service; do
    echo -e "  - ${GREEN}${service}${NC} (existing - will NOT be affected)"
  done
else
  echo -e "  ${GREEN}(none)${NC}"
fi
echo ""

CONFLICTS_FOUND=0

# Check Cloud Run services
echo -e "${BLUE}Checking Cloud Run services...${NC}"

if gcloud run services describe ${SERVICE_BACKEND} --region ${REGION} &>/dev/null; then
  echo -e "${RED}❌ CONFLICT: Cloud Run service '${SERVICE_BACKEND}' already exists${NC}"
  echo -e "${YELLOW}   This service will be UPDATED/REPLACED if you deploy.${NC}"
  CONFLICTS_FOUND=1
else
  echo -e "${GREEN}✅ Backend service name '${SERVICE_BACKEND}' is available${NC}"
fi

if gcloud run services describe ${SERVICE_FRONTEND} --region ${REGION} &>/dev/null; then
  echo -e "${RED}❌ CONFLICT: Cloud Run service '${SERVICE_FRONTEND}' already exists${NC}"
  echo -e "${YELLOW}   This service will be UPDATED/REPLACED if you deploy.${NC}"
  CONFLICTS_FOUND=1
else
  echo -e "${GREEN}✅ Frontend service name '${SERVICE_FRONTEND}' is available${NC}"
fi

echo ""

# Check Cloud SQL instances
echo -e "${BLUE}Checking Cloud SQL instances...${NC}"

if gcloud sql instances describe ${DATABASE_INSTANCE} --project=${PROJECT_ID} &>/dev/null; then
  echo -e "${RED}❌ CONFLICT: Cloud SQL instance '${DATABASE_INSTANCE}' already exists${NC}"
  echo -e "${YELLOW}   The setup script will skip creating this instance.${NC}"
  CONFLICTS_FOUND=1
else
  echo -e "${GREEN}✅ Database instance name '${DATABASE_INSTANCE}' is available${NC}"
fi

# Check if database exists (if instance exists)
if gcloud sql instances describe ${DATABASE_INSTANCE} --project=${PROJECT_ID} &>/dev/null; then
  if gcloud sql databases describe ${DATABASE_NAME} --instance=${DATABASE_INSTANCE} --project=${PROJECT_ID} &>/dev/null; then
    echo -e "${RED}❌ CONFLICT: Database '${DATABASE_NAME}' already exists in instance '${DATABASE_INSTANCE}'${NC}"
    echo -e "${YELLOW}   The setup script will skip creating this database.${NC}"
    CONFLICTS_FOUND=1
  else
    echo -e "${GREEN}✅ Database name '${DATABASE_NAME}' is available${NC}"
  fi
fi

echo ""

# Check Container Registry images
echo -e "${BLUE}Checking Container Registry images...${NC}"

if gcloud container images describe gcr.io/${PROJECT_ID}/${SERVICE_BACKEND} &>/dev/null; then
  echo -e "${YELLOW}⚠️  Image 'gcr.io/${PROJECT_ID}/${SERVICE_BACKEND}' exists (will be overwritten)${NC}"
else
  echo -e "${GREEN}✅ Backend image name is available${NC}"
fi

if gcloud container images describe gcr.io/${PROJECT_ID}/${SERVICE_FRONTEND} &>/dev/null; then
  echo -e "${YELLOW}⚠️  Image 'gcr.io/${PROJECT_ID}/${SERVICE_FRONTEND}' exists (will be overwritten)${NC}"
else
  echo -e "${GREEN}✅ Frontend image name is available${NC}"
fi

echo ""

# Summary
if [ $CONFLICTS_FOUND -eq 0 ]; then
  echo -e "${GREEN}✅ No conflicts found! Safe to deploy.${NC}"
  echo ""
  echo -e "${BLUE}Safety Guarantee:${NC}"
  echo -e "  ✅ All service names are unique"
  echo -e "  ✅ Existing services will NOT be affected"
  echo -e "  ✅ Your existing site/backend will continue working normally"
  echo -e "  ✅ Kansas Beta will be deployed as separate, independent services"
  echo ""
  echo -e "${GREEN}You can proceed with deployment safely!${NC}"
  exit 0
else
  echo -e "${RED}❌ Conflicts found!${NC}"
  echo ""
  echo -e "${YELLOW}Options:${NC}"
  echo -e "  1. Use different service names (edit deploy.sh and setup-gcp.sh)"
  echo -e "  2. Delete conflicting services (if they're not needed)"
  echo -e "  3. Use a different GCP project"
  echo ""
  echo -e "${BLUE}To customize service names, edit these variables in deploy.sh:${NC}"
  echo -e "  SERVICE_BACKEND=\"${SERVICE_BACKEND}\""
  echo -e "  SERVICE_FRONTEND=\"${SERVICE_FRONTEND}\""
  echo -e "  DATABASE_INSTANCE=\"${DATABASE_INSTANCE}\""
  echo -e "  DATABASE_NAME=\"${DATABASE_NAME}\""
  exit 1
fi

