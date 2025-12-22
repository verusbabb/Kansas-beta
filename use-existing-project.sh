#!/bin/bash

# Quick script to configure Kansas Beta to use an existing GCP project
# Usage: ./use-existing-project.sh [PROJECT_ID]

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

EXISTING_PROJECT="${1:-verusware}"

echo -e "${BLUE}🔧 Configuring Kansas Beta to use existing project: ${EXISTING_PROJECT}${NC}"
echo ""

# Check if project exists
if ! gcloud projects describe ${EXISTING_PROJECT} &>/dev/null; then
  echo -e "${YELLOW}⚠️  Project ${EXISTING_PROJECT} not found.${NC}"
  echo -e "${YELLOW}   Please check the project ID and try again.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Project ${EXISTING_PROJECT} exists${NC}"
echo ""

# Check for conflicts first
echo -e "${BLUE}Checking for naming conflicts...${NC}"
if [ -f "./check-conflicts.sh" ]; then
  ./check-conflicts.sh ${EXISTING_PROJECT}
  CONFLICT_RESULT=$?
  echo ""
  
  if [ $CONFLICT_RESULT -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Conflicts detected. Please resolve them before proceeding.${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}⚠️  Conflict checker not found. Proceeding anyway...${NC}"
  echo ""
fi

# Update setup-gcp.sh
echo -e "${BLUE}Updating setup-gcp.sh...${NC}"
if [ -f "./setup-gcp.sh" ]; then
  sed -i.bak "s/^PROJECT_ID=\"kansas-beta\"/PROJECT_ID=\"${EXISTING_PROJECT}\"/" ./setup-gcp.sh
  echo -e "${GREEN}✅ Updated setup-gcp.sh${NC}"
else
  echo -e "${YELLOW}⚠️  setup-gcp.sh not found${NC}"
fi

# Update deploy.sh
echo -e "${BLUE}Updating deploy.sh...${NC}"
if [ -f "./deploy.sh" ]; then
  sed -i.bak "s/^PROJECT_ID=\"kansas-beta\"/PROJECT_ID=\"${EXISTING_PROJECT}\"/" ./deploy.sh
  echo -e "${GREEN}✅ Updated deploy.sh${NC}"
else
  echo -e "${YELLOW}⚠️  deploy.sh not found${NC}"
fi

# Update cloudbuild.yaml (if needed - it uses $PROJECT_ID variable, so should be fine)
echo -e "${BLUE}Checking cloudbuild.yaml...${NC}"
if [ -f "./cloudbuild.yaml" ]; then
  echo -e "${GREEN}✅ cloudbuild.yaml uses \$PROJECT_ID (will use ${EXISTING_PROJECT})${NC}"
fi

echo ""
echo -e "${GREEN}✅ Configuration complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Run: ./setup-gcp.sh"
echo -e "     (It will detect the project exists and skip creation)"
echo -e "  2. Continue with database setup and deployment"
echo ""
echo -e "${YELLOW}Note: Backup files created with .bak extension${NC}"
echo -e "${YELLOW}      You can delete them if everything looks good${NC}"

