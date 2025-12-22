#!/bin/bash

# Reset Cloud SQL database password and update Secret Manager

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PROJECT_ID="verusware"
INSTANCE_NAME="kansas-beta-db"
DB_USER="postgres"
SECRET_NAME="database-password"

echo -e "${BLUE}🔐 Resetting Cloud SQL database password and updating Secret Manager...${NC}"
echo ""

# Generate a secure random password
echo -e "${BLUE}📝 Generating a secure random password...${NC}"
NEW_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

if [ -z "$NEW_PASSWORD" ]; then
  echo -e "${RED}❌ Failed to generate password. Make sure openssl is installed.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Generated new password${NC}"
echo ""

# Set the password on Cloud SQL
echo -e "${BLUE}🔧 Setting new password on Cloud SQL database...${NC}"
gcloud sql users set-password ${DB_USER} \
  --instance=${INSTANCE_NAME} \
  --password="${NEW_PASSWORD}" \
  --project=${PROJECT_ID}

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Cloud SQL password updated successfully${NC}"
else
  echo -e "${RED}❌ Failed to update Cloud SQL password${NC}"
  exit 1
fi

echo ""

# Update Secret Manager
echo -e "${BLUE}🔧 Updating Secret Manager with new password...${NC}"
echo -n "${NEW_PASSWORD}" | gcloud secrets versions add ${SECRET_NAME} \
  --data-file=- \
  --project=${PROJECT_ID}

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Secret Manager updated successfully${NC}"
else
  echo -e "${RED}❌ Failed to update Secret Manager${NC}"
  echo -e "${YELLOW}⚠️  Cloud SQL password was updated, but Secret Manager was not.${NC}"
  echo -e "${YELLOW}   You'll need to manually update Secret Manager or the connection will fail.${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Successfully reset database password and updated Secret Manager!${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: The new password has been set.${NC}"
echo -e "${YELLOW}   Next step: Redeploy your backend to use the new password:${NC}"
echo -e "${BLUE}   bash deploy.sh backend${NC}"
echo ""

