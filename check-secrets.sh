#!/bin/bash

# Check if required secrets exist in Secret Manager

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PROJECT_ID="verusware"

echo -e "${BLUE}🔍 Checking Secret Manager secrets...${NC}"
echo ""

# Required secrets
REQUIRED_SECRETS=("database-password" "database-user")

for secret in "${REQUIRED_SECRETS[@]}"; do
  if gcloud secrets describe ${secret} --project=${PROJECT_ID} &>/dev/null; then
    echo -e "${GREEN}✅ Secret '${secret}' exists${NC}"
  else
    echo -e "${RED}❌ Secret '${secret}' does NOT exist${NC}"
  fi
done

echo ""
echo -e "${BLUE}📋 All secrets in project:${NC}"
gcloud secrets list --project=${PROJECT_ID} --format="table(name,createTime)" 2>/dev/null || echo "Unable to list secrets"

echo ""
echo -e "${YELLOW}If secrets are missing, create them with:${NC}"
echo -e "${BLUE}  # Database password (REQUIRED)${NC}"
echo -e "${BLUE}  echo -n 'YOUR_DATABASE_PASSWORD' | gcloud secrets create database-password \\${NC}"
echo -e "${BLUE}    --project=${PROJECT_ID} \\${NC}"
echo -e "${BLUE}    --replication-policy=\"automatic\"${NC}"
echo ""
echo -e "${BLUE}  # Database user (optional, defaults to 'postgres')${NC}"
echo -e "${BLUE}  echo -n 'postgres' | gcloud secrets create database-user \\${NC}"
echo -e "${BLUE}    --project=${PROJECT_ID} \\${NC}"
echo -e "${BLUE}    --replication-policy=\"automatic\"${NC}"

