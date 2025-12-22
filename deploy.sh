#!/bin/bash

# Kansas Beta Deployment Script
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
DATABASE_INSTANCE="kansas-beta-db"
DATABASE_NAME="kansas_beta"
SERVICE_BACKEND="kansas-beta-backend"
SERVICE_FRONTEND="kansas-beta-frontend"

# Get backend URL dynamically (will use default Cloud Run URL if no custom domain)
get_backend_url() {
  BACKEND_URL=$(gcloud run services describe ${SERVICE_BACKEND} \
    --region ${REGION} \
    --format="value(status.url)" 2>/dev/null || echo "")
  echo ${BACKEND_URL}
}

# Function to run migrations
run_migrations() {
  echo -e "${BLUE}📦 Running database migrations...${NC}"
  
  # Get backend URL for reference
  BACKEND_URL=$(get_backend_url)
  
  # Run migrations using Cloud Build
  echo -e "${BLUE}   This will run migrations in a Cloud Build job...${NC}"
  gcloud builds submit \
    --config=cloudbuild.yaml \
    --substitutions=_FRONTEND_API_URL=${FRONTEND_URL:-},_APP_NAME="Kansas Beta",_APP_VERSION="1.0.0",_DATABASE_INSTANCE=${DATABASE_INSTANCE},_DATABASE_NAME=${DATABASE_NAME},_DATABASE_USER=postgres \
    --only=run-migrations \
    --project ${PROJECT_ID} || {
    echo -e "${YELLOW}⚠️  Cloud Build migration failed. Trying alternative method...${NC}"
    echo -e "${BLUE}   You can run migrations manually using:${NC}"
    echo -e "${BLUE}   cd backend && ./run-production-migration.sh${NC}"
    return 1
  }
  
  echo -e "${GREEN}✅ Migrations completed!${NC}"
}

# Function to deploy backend
deploy_backend() {
  echo -e "${BLUE}🚀 Deploying backend...${NC}"
  cd backend
  
  echo -e "${BLUE}📦 Building backend Docker image...${NC}"
  gcloud builds submit --tag gcr.io/${PROJECT_ID}/${SERVICE_BACKEND}
  
  # Get frontend URL if it exists (for CORS configuration)
  FRONTEND_URL=$(gcloud run services describe ${SERVICE_FRONTEND} \
    --region ${REGION} \
    --format="value(status.url)" 2>/dev/null || echo "")
  
  # Build env vars
  ENV_VARS="NODE_ENV=production,GCP_SECRET_MANAGER_ENABLED=true,GCP_PROJECT_ID=${PROJECT_ID},DATABASE_HOST=/cloudsql/${PROJECT_ID}:${REGION}:${DATABASE_INSTANCE},DATABASE_NAME=${DATABASE_NAME},DATABASE_USER=postgres"
  
  # Add frontend URL if available
  if [ -n "$FRONTEND_URL" ]; then
    ENV_VARS="${ENV_VARS},FRONTEND_URL=${FRONTEND_URL}"
    echo -e "${BLUE}   Configuring CORS for frontend: ${FRONTEND_URL}${NC}"
  else
    echo -e "${YELLOW}   Frontend not deployed yet. CORS will allow all Cloud Run URLs.${NC}"
  fi
  
  echo -e "${BLUE}🚀 Deploying backend to Cloud Run...${NC}"
  gcloud run deploy ${SERVICE_BACKEND} \
    --image gcr.io/${PROJECT_ID}/${SERVICE_BACKEND} \
    --region ${REGION} \
    --platform managed \
    --allow-unauthenticated \
    --port 3000 \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --timeout 300 \
    --set-env-vars ${ENV_VARS} \
    --add-cloudsql-instances ${PROJECT_ID}:${REGION}:${DATABASE_INSTANCE}
  
  cd ..
  echo -e "${GREEN}✅ Backend deployed successfully!${NC}"
}

# Function to deploy frontend
deploy_frontend() {
  echo -e "${BLUE}🚀 Deploying frontend...${NC}"
  cd frontend
  
  # Get backend URL for frontend API configuration
  BACKEND_URL=$(get_backend_url)
  if [ -z "$BACKEND_URL" ]; then
    echo -e "${YELLOW}⚠️  Backend URL not found. Using placeholder. Update after backend is deployed.${NC}"
    BACKEND_URL="https://${SERVICE_BACKEND}-${PROJECT_ID}.a.run.app"
  fi
  
  echo -e "${BLUE}📦 Building frontend Docker image...${NC}"
  echo -e "${BLUE}   Using backend URL: ${BACKEND_URL}${NC}"
  gcloud builds submit --config=cloudbuild.yaml \
    --substitutions=_FRONTEND_API_URL=${BACKEND_URL}
  
  echo -e "${BLUE}🚀 Deploying frontend to Cloud Run...${NC}"
  gcloud run deploy ${SERVICE_FRONTEND} \
    --image gcr.io/${PROJECT_ID}/${SERVICE_FRONTEND} \
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

# Function to run migrations via Cloud Build
run_migrations_cloudbuild() {
  echo -e "${BLUE}📦 Running database migrations...${NC}"
  
  # Create a simple migration-only Cloud Build config
  cat > /tmp/migrations-build.yaml <<EOF
steps:
  - name: 'gcr.io/cloud-builders/gcloud'
    entrypoint: 'bash'
    args:
      - '-c'
      - 'echo "Setting up Cloud SQL connection..."'
    volumes:
      - name: 'cloudsql'
        path: /cloudsql
    id: 'setup'
  
  - name: 'node:20'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        cd backend
        npm ci --production=false
        npm run migration:run
    env:
      - 'NODE_ENV=production'
      - 'DATABASE_HOST=/cloudsql/\$PROJECT_ID:us-central1:${DATABASE_INSTANCE}'
      - 'DATABASE_NAME=${DATABASE_NAME}'
      - 'DATABASE_USER=postgres'
      - 'GCP_SECRET_MANAGER_ENABLED=true'
      - 'GCP_PROJECT_ID=\$PROJECT_ID'
    volumes:
      - name: 'cloudsql'
        path: /cloudsql
    waitFor: ['setup']
    id: 'run-migrations'

options:
  machineType: 'E2_HIGHCPU_8'
  logging: CLOUD_LOGGING_ONLY

timeout: '600s'
EOF

  echo -e "${BLUE}   Submitting migration job...${NC}"
  gcloud builds submit --config=/tmp/migrations-build.yaml --project ${PROJECT_ID}
  rm -f /tmp/migrations-build.yaml
  
  echo -e "${GREEN}✅ Migrations completed!${NC}"
}

# Function to deploy both using Cloud Build (includes migrations)
deploy_both_cloudbuild() {
  echo -e "${BLUE}🚀 Deploying everything (separate steps with migrations)...${NC}"
  echo ""
  
  # Step 1: Run migrations
  echo -e "${BLUE}📦 Step 1: Running database migrations...${NC}"
  run_migrations_cloudbuild || {
    echo -e "${YELLOW}⚠️  Migration step failed. Continuing with deployment...${NC}"
    echo -e "${YELLOW}   You may need to run migrations manually.${NC}"
  }
  echo ""
  
  # Step 2: Deploy backend
  echo -e "${BLUE}📦 Step 2: Deploying backend...${NC}"
  deploy_backend
  echo ""
  
  # Step 3: Deploy frontend
  echo -e "${BLUE}📦 Step 3: Deploying frontend...${NC}"
  deploy_frontend
  
  echo ""
  echo -e "${GREEN}✅ Full deployment completed!${NC}"
}

# Function to deploy both (legacy method - separate steps)
deploy_both() {
  echo -e "${BLUE}🚀 Deploying both backend and frontend (separate steps)...${NC}"
  
  # Run migrations first
  echo -e "${BLUE}📦 Step 1: Running database migrations...${NC}"
  run_migrations || {
    echo -e "${YELLOW}⚠️  Migration step failed or skipped. Continuing with deployment...${NC}"
    echo -e "${YELLOW}   You may need to run migrations manually.${NC}"
  }
  echo ""
  
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
    # Use Cloud Build for full deployment (includes migrations)
    deploy_both_cloudbuild
    ;;
  cloudbuild|cb)
    # Explicit Cloud Build deployment
    deploy_both_cloudbuild
    ;;
  legacy)
    # Legacy separate-step deployment
    deploy_both
    ;;
  *)
    echo -e "${YELLOW}Usage: ./deploy.sh [backend|frontend|both|cloudbuild|legacy]${NC}"
    echo -e "${YELLOW}  backend     - Deploy only the backend${NC}"
    echo -e "${YELLOW}  frontend   - Deploy only the frontend${NC}"
    echo -e "${YELLOW}  both        - Deploy both via Cloud Build (default, includes migrations)${NC}"
    echo -e "${YELLOW}  cloudbuild  - Same as 'both' - full Cloud Build deployment${NC}"
    echo -e "${YELLOW}  legacy      - Deploy both using separate steps (old method)${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"

# Get service URLs
BACKEND_URL=$(get_backend_url)
FRONTEND_URL=$(gcloud run services describe ${SERVICE_FRONTEND} \
  --region ${REGION} \
  --format="value(status.url)" 2>/dev/null || echo "")

if [ -n "$BACKEND_URL" ]; then
  echo -e "${BLUE}Backend URL: ${BACKEND_URL}${NC}"
else
  echo -e "${YELLOW}Backend URL: Not deployed yet${NC}"
fi

if [ -n "$FRONTEND_URL" ]; then
  echo -e "${BLUE}Frontend URL: ${FRONTEND_URL}${NC}"
else
  echo -e "${YELLOW}Frontend URL: Not deployed yet${NC}"
fi

