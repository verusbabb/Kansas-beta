#!/bin/bash

# Kansas Beta GCP Setup Script
# This script sets up a new GCP project for Kansas Beta deployment

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="verusware"
PROJECT_NAME="Kansas Beta"
REGION="us-central1"
DATABASE_INSTANCE="kansas-beta-db"
DATABASE_NAME="kansas_beta"
DATABASE_USER="postgres"
SERVICE_BACKEND="kansas-beta-backend"
SERVICE_FRONTEND="kansas-beta-frontend"

echo -e "${BLUE}🚀 Setting up GCP project for Kansas Beta...${NC}"
echo ""

# Check if gcloud is available
if ! command -v gcloud &> /dev/null; then
  echo -e "${RED}Error: gcloud CLI not found. Please install Google Cloud SDK.${NC}"
  exit 1
fi

# Step 1: Create GCP Project
echo -e "${BLUE}Step 1: Creating GCP project...${NC}"
if gcloud projects describe ${PROJECT_ID} &>/dev/null; then
  echo -e "${YELLOW}Project ${PROJECT_ID} already exists.${NC}"
  echo -e "${YELLOW}⚠️  This is an existing project. Checking for naming conflicts...${NC}"
  echo ""
  
  # Check for conflicts
  if [ -f "./check-conflicts.sh" ]; then
    ./check-conflicts.sh ${PROJECT_ID}
    CONFLICT_CHECK=$?
    if [ $CONFLICT_CHECK -ne 0 ]; then
      echo ""
      echo -e "${RED}⚠️  Conflicts detected!${NC}"
      echo -e "${YELLOW}Deploying will UPDATE/REPLACE existing services with the same names.${NC}"
      echo -e "${YELLOW}Press Ctrl+C to cancel, or Enter to continue anyway...${NC}"
      read
    fi
  else
    echo -e "${YELLOW}⚠️  Using existing project. Make sure service names don't conflict.${NC}"
    echo -e "${YELLOW}   Services: ${SERVICE_BACKEND}, ${SERVICE_FRONTEND}${NC}"
    echo -e "${YELLOW}   Database: ${DATABASE_INSTANCE}${NC}"
    echo -e "${YELLOW}   Press Enter to continue or Ctrl+C to cancel...${NC}"
    read
  fi
  echo ""
else
  echo -e "${BLUE}Creating project ${PROJECT_ID}...${NC}"
  gcloud projects create ${PROJECT_ID} --name="${PROJECT_NAME}"
  echo -e "${GREEN}✅ Project created${NC}"
fi

# Set the project as default
echo -e "${BLUE}Setting ${PROJECT_ID} as default project...${NC}"
gcloud config set project ${PROJECT_ID}
echo -e "${GREEN}✅ Project set as default${NC}"
echo ""

# Step 2: Check and enable billing
echo -e "${BLUE}Step 2: Checking billing status...${NC}"

# Check if billing is enabled
BILLING_ENABLED=$(gcloud beta billing projects describe ${PROJECT_ID} --format="value(billingAccountName)" 2>/dev/null || echo "")

if [ -n "$BILLING_ENABLED" ] && [ "$BILLING_ENABLED" != "" ]; then
  echo -e "${GREEN}✅ Billing is already enabled${NC}"
else
  echo -e "${YELLOW}⚠️  Billing is not enabled for this project.${NC}"
  echo ""
  echo -e "${YELLOW}You have two options:${NC}"
  echo ""
  echo -e "${BLUE}Option 1: Request a billing quota increase${NC}"
  echo -e "   1. Click the 'Request quota increase' button in the dialog"
  echo -e "   2. Or visit: https://support.google.com/cloud/contact/cloud_platform_billing"
  echo -e "   3. Wait for approval (usually within 24 hours)"
  echo -e "   4. Then enable billing: https://console.cloud.google.com/billing/linkedaccount?project=${PROJECT_ID}"
  echo ""
  echo -e "${BLUE}Option 2: Use an existing project with billing enabled${NC}"
  echo -e "   If you have another GCP project with billing enabled, you can:"
  echo -e "   1. Cancel this script (Ctrl+C)"
  echo -e "   2. Update PROJECT_ID in this script or set it manually:"
  echo -e "      export PROJECT_ID=your-existing-project-id"
  echo -e "   3. Run this script again"
  echo ""
  echo -e "${YELLOW}Note: Cloud SQL requires billing to be enabled.${NC}"
  echo -e "${YELLOW}You can continue with API setup, but database creation will fail without billing.${NC}"
  echo ""
  echo -e "${YELLOW}Press Enter to continue with API setup (you can enable billing later)...${NC}"
  echo -e "${YELLOW}Or press Ctrl+C to exit and request quota increase first...${NC}"
  read
fi
echo ""

# Step 3: Enable required APIs
echo -e "${BLUE}Step 2: Enabling required GCP APIs...${NC}"
APIS=(
  "cloudbuild.googleapis.com"
  "run.googleapis.com"
  "sqladmin.googleapis.com"
  "secretmanager.googleapis.com"
  "cloudresourcemanager.googleapis.com"
  "servicenetworking.googleapis.com"
  "compute.googleapis.com"
)

for api in "${APIS[@]}"; do
  echo -e "${BLUE}Enabling ${api}...${NC}"
  gcloud services enable ${api} --project=${PROJECT_ID}
done
echo -e "${GREEN}✅ All APIs enabled${NC}"
echo ""

# Step 4: Create Cloud SQL Postgres instance
echo -e "${BLUE}Step 4: Creating Cloud SQL Postgres instance...${NC}"

# Check billing again before creating database
BILLING_ENABLED=$(gcloud beta billing projects describe ${PROJECT_ID} --format="value(billingAccountName)" 2>/dev/null || echo "")

if [ -z "$BILLING_ENABLED" ] || [ "$BILLING_ENABLED" = "" ]; then
  echo -e "${RED}❌ Billing is not enabled. Cannot create Cloud SQL instance.${NC}"
  echo -e "${YELLOW}Please enable billing first, then run this script again or create the instance manually:${NC}"
  echo -e "${YELLOW}   gcloud sql instances create ${DATABASE_INSTANCE} \\${NC}"
  echo -e "${YELLOW}     --database-version=POSTGRES_15 \\${NC}"
  echo -e "${YELLOW}     --tier=db-f1-micro \\${NC}"
  echo -e "${YELLOW}     --region=${REGION} \\${NC}"
  echo -e "${YELLOW}     --root-password=YOUR_PASSWORD${NC}"
  echo ""
else
  if gcloud sql instances describe ${DATABASE_INSTANCE} --project=${PROJECT_ID} &>/dev/null; then
    echo -e "${YELLOW}Database instance ${DATABASE_INSTANCE} already exists.${NC}"
  else
    echo -e "${BLUE}Creating PostgreSQL instance (this may take several minutes)...${NC}"
    if gcloud sql instances create ${DATABASE_INSTANCE} \
      --database-version=POSTGRES_15 \
      --tier=db-f1-micro \
      --region=${REGION} \
      --root-password="" \
      --project=${PROJECT_ID} 2>&1; then
      echo -e "${GREEN}✅ Database instance created${NC}"
      echo -e "${YELLOW}⚠️  You will need to set a root password. Run:${NC}"
      echo -e "${YELLOW}   gcloud sql users set-password postgres --instance=${DATABASE_INSTANCE} --password=YOUR_PASSWORD${NC}"
    else
      echo -e "${RED}❌ Failed to create database instance. Check billing status and try again.${NC}"
    fi
  fi
fi
echo ""

# Step 5: Create database
echo -e "${BLUE}Step 5: Creating database...${NC}"
if gcloud sql databases describe ${DATABASE_NAME} --instance=${DATABASE_INSTANCE} --project=${PROJECT_ID} &>/dev/null; then
  echo -e "${YELLOW}Database ${DATABASE_NAME} already exists.${NC}"
else
  echo -e "${BLUE}Creating database ${DATABASE_NAME}...${NC}"
  gcloud sql databases create ${DATABASE_NAME} \
    --instance=${DATABASE_INSTANCE} \
    --project=${PROJECT_ID}
  echo -e "${GREEN}✅ Database created${NC}"
fi
echo ""

# Step 6: Create secrets in Secret Manager
echo -e "${BLUE}Step 6: Setting up Secret Manager...${NC}"
echo -e "${YELLOW}⚠️  You need to create the following secrets in Secret Manager:${NC}"
echo -e "${YELLOW}   - database-password: PostgreSQL database password${NC}"
echo -e "${YELLOW}   - database-user: Database user (default: postgres)${NC}"
echo -e "${YELLOW}   - jwt-secret: JWT secret for authentication${NC}"
echo ""
echo -e "${BLUE}Example command to create database-password secret:${NC}"
echo -e "${BLUE}  echo -n 'your-password' | gcloud secrets create database-password \\${NC}"
echo -e "${BLUE}    --data-file=- \\${NC}"
echo -e "${BLUE}    --replication-policy='automatic'${NC}"
echo ""

# Step 7: Grant Cloud Build service account permissions
echo -e "${BLUE}Step 7: Granting Cloud Build permissions...${NC}"
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

echo -e "${BLUE}Granting Cloud Run Admin role...${NC}"
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/run.admin"

echo -e "${BLUE}Granting Service Account User role...${NC}"
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/iam.serviceAccountUser"

echo -e "${BLUE}Granting Cloud SQL Client role...${NC}"
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/cloudsql.client"

echo -e "${GREEN}✅ Permissions granted${NC}"
echo ""

# Summary
echo -e "${GREEN}🎉 GCP setup complete!${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo -e "  Project ID: ${PROJECT_ID}"
echo -e "  Region: ${REGION}"
echo -e "  Database Instance: ${DATABASE_INSTANCE}"
echo -e "  Database Name: ${DATABASE_NAME}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
if [ -z "$BILLING_ENABLED" ] || [ "$BILLING_ENABLED" = "" ]; then
  echo -e "  1. ${RED}Enable billing for this project (required for Cloud SQL)${NC}"
  echo -e "     - Request quota increase if needed: https://support.google.com/cloud/contact/cloud_platform_billing"
  echo -e "     - Or use an existing project with billing enabled"
  echo -e "  2. Create Cloud SQL instance (if billing is now enabled):"
  echo -e "     gcloud sql instances create ${DATABASE_INSTANCE} \\"
  echo -e "       --database-version=POSTGRES_15 \\"
  echo -e "       --tier=db-f1-micro \\"
  echo -e "       --region=${REGION} \\"
  echo -e "       --root-password=YOUR_PASSWORD"
  echo -e "  3. Create database:"
  echo -e "     gcloud sql databases create ${DATABASE_NAME} --instance=${DATABASE_INSTANCE}"
else
  echo -e "  1. Set database root password (if not done):"
  echo -e "     gcloud sql users set-password postgres --instance=${DATABASE_INSTANCE} --password=YOUR_PASSWORD"
fi
echo -e "  2. Create secrets in Secret Manager (see above)"
echo -e "  3. Run migrations: cd backend && npm run migration:run"
echo -e "  4. Deploy: ./deploy.sh"
echo ""

