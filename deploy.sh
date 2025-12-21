#!/bin/bash

# Verusware Deployment Script
# Usage: ./deploy.sh [backend|frontend|both]

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load gcloud path
if [ -f ~/google-cloud-sdk/path.zsh.inc ]; then
  source ~/google-cloud-sdk/path.zsh.inc
elif [ -f ~/google-cloud-sdk/path.bash.inc ]; then
  source ~/google-cloud-sdk/path.bash.inc
fi

# Check if gcloud is available
if ! command -v gcloud &> /dev/null; then
  echo -e "${YELLOW}Error: gcloud CLI not found. Please ensure it's installed and in your PATH.${NC}"
  exit 1
fi

# Set project
PROJECT_ID="verusware"
REGION="us-central1"
FRONTEND_API_URL="https://api.verusware.com"

# Function to deploy backend
deploy_backend() {
  echo -e "${BLUE}🚀 Deploying backend...${NC}"
  cd backend
  
  echo -e "${BLUE}📦 Building backend Docker image...${NC}"
  gcloud builds submit --tag gcr.io/${PROJECT_ID}/verusware-backend
  
  echo -e "${BLUE}🚀 Deploying backend to Cloud Run...${NC}"
  gcloud run deploy verusware-backend \
    --image gcr.io/${PROJECT_ID}/verusware-backend \
    --region ${REGION} \
    --platform managed \
    --allow-unauthenticated \
    --port 3000 \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --set-env-vars NODE_ENV=production,GCP_SECRET_MANAGER_ENABLED=true,GCP_PROJECT_ID=${PROJECT_ID},DATABASE_HOST=/cloudsql/${PROJECT_ID}:${REGION}:verusware-db,DATABASE_NAME=verusware \
    --add-cloudsql-instances ${PROJECT_ID}:${REGION}:verusware-db
  
  cd ..
  echo -e "${GREEN}✅ Backend deployed successfully!${NC}"
}

# Function to deploy frontend
deploy_frontend() {
  echo -e "${BLUE}🚀 Deploying frontend...${NC}"
  cd frontend
  
  echo -e "${BLUE}📦 Building frontend Docker image...${NC}"
  gcloud builds submit --config=cloudbuild.yaml \
    --substitutions=_FRONTEND_API_URL=${FRONTEND_API_URL}
  
  echo -e "${BLUE}🚀 Deploying frontend to Cloud Run...${NC}"
  gcloud run deploy verusware-frontend \
    --image gcr.io/${PROJECT_ID}/verusware-frontend \
    --region ${REGION} \
    --platform managed \
    --allow-unauthenticated \
    --port 80 \
    --memory 256Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10
  
  cd ..
  echo -e "${GREEN}✅ Frontend deployed successfully!${NC}"
}

# Function to deploy both
deploy_both() {
  echo -e "${BLUE}🚀 Deploying both backend and frontend...${NC}"
  deploy_backend
  echo ""
  deploy_frontend
  echo -e "${GREEN}✅ All services deployed successfully!${NC}"
}

# Parse command line argument
DEPLOY_TARGET=${1:-both}

case $DEPLOY_TARGET in
  backend)
    deploy_backend
    ;;
  frontend)
    deploy_frontend
    ;;
  both|"")
    deploy_both
    ;;
  *)
    echo -e "${YELLOW}Usage: ./deploy.sh [backend|frontend|both]${NC}"
    echo -e "${YELLOW}  backend  - Deploy only the backend${NC}"
    echo -e "${YELLOW}  frontend - Deploy only the frontend${NC}"
    echo -e "${YELLOW}  both     - Deploy both (default)${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo -e "${BLUE}Backend URL: https://api.verusware.com${NC}"
echo -e "${BLUE}Frontend URL: https://verusware.com${NC}"

