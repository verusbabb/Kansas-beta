#!/bin/bash

# Run database migrations in production (Cloud SQL)
# This script connects to Cloud SQL and runs pending migrations

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
DATABASE_USER="postgres"

echo -e "${BLUE}🚀 Running database migrations in production...${NC}"
echo ""

# Check if Cloud SQL Proxy is needed
echo -e "${BLUE}📋 Checking Cloud SQL connection...${NC}"

# Set environment variables for migration
export NODE_ENV=production
export DATABASE_HOST="/cloudsql/${PROJECT_ID}:${REGION}:${DATABASE_INSTANCE}"
export DATABASE_NAME="${DATABASE_NAME}"
export DATABASE_USER="${DATABASE_USER}"
export GCP_SECRET_MANAGER_ENABLED=true
export GCP_PROJECT_ID="${PROJECT_ID}"

echo -e "${BLUE}  Project: ${PROJECT_ID}${NC}"
echo -e "${BLUE}  Database: ${DATABASE_NAME}${NC}"
echo -e "${BLUE}  Instance: ${DATABASE_INSTANCE}${NC}"
echo ""

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Error: Must run from backend directory${NC}"
  exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo -e "${BLUE}📦 Installing dependencies...${NC}"
  npm ci --production=false
fi

# Run migrations
echo -e "${BLUE}📦 Running migrations...${NC}"
npm run migration:run

echo ""
echo -e "${GREEN}✅ Migrations completed!${NC}"
echo ""
echo -e "${BLUE}💡 To verify, check Cloud Run logs or connect to the database directly.${NC}"

