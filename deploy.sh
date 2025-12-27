#!/bin/bash

# Kansas Beta Deployment Script
# Usage: ./deploy.sh [backend|frontend|migrations|seeders|all]
#
# This script uses cloudbuild.yaml as the single source of truth for all deployments.
# It handles fetching secrets and URLs, then passes them as substitutions to Cloud Build.

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Load gcloud path
if [ -f ~/google-cloud-sdk/path.zsh.inc ]; then
  source ~/google-cloud-sdk/path.zsh.inc
elif [ -f ~/google-cloud-sdk/path.bash.inc ]; then
  source ~/google-cloud-sdk/path.bash.inc
fi

# Check if gcloud is available
if ! command -v gcloud &> /dev/null; then
  echo -e "${RED}Error: gcloud CLI not found. Please ensure it's installed and in your PATH.${NC}"
  exit 1
fi

# Configuration
PROJECT_ID="verusware"
REGION="us-central1"
DATABASE_INSTANCE="kansas-beta-db"
DATABASE_NAME="kansas_beta"
SERVICE_BACKEND="kansas-beta-backend"
SERVICE_FRONTEND="kansas-beta-frontend"

# Get backend URL from Cloud Run
get_backend_url() {
  local url=$(gcloud run services describe ${SERVICE_BACKEND} \
    --region ${REGION} \
    --format="value(status.url)" 2>/dev/null || echo "")
  echo "${url}"
}

# Get Auth0 secrets from Secret Manager
get_auth0_secrets() {
  local domain=$(gcloud secrets versions access latest --secret="auth0-domain" --project=${PROJECT_ID} 2>/dev/null || echo "")
  local client_id=$(gcloud secrets versions access latest --secret="auth0-client-id" --project=${PROJECT_ID} 2>/dev/null || echo "")
  local audience=$(gcloud secrets versions access latest --secret="auth0-audience" --project=${PROJECT_ID} 2>/dev/null || echo "")
  
  echo "${domain}|${client_id}|${audience}"
}

# Build substitution string
build_substitutions() {
  local backend_url=$1
  local auth0_domain=$2
  local auth0_client_id=$3
  local auth0_audience=$4
  
  local subs="_APP_NAME=Kansas Beta,_APP_VERSION=1.0.0,_DATABASE_INSTANCE=${DATABASE_INSTANCE},_DATABASE_NAME=${DATABASE_NAME},_DATABASE_USER=postgres"
  
  # Always include _FRONTEND_API_URL - use provided URL or fallback to expected Cloud Run URL pattern
  if [ -n "${backend_url}" ]; then
    subs="${subs},_FRONTEND_API_URL=${backend_url}"
  else
    # Fallback to expected Cloud Run URL pattern if backend URL not found
    subs="${subs},_FRONTEND_API_URL=https://${SERVICE_BACKEND}-${PROJECT_ID}.a.run.app"
  fi
  
  if [ -n "${auth0_domain}" ]; then
    subs="${subs},_VITE_AUTH0_DOMAIN=${auth0_domain}"
  fi
  
  if [ -n "${auth0_client_id}" ]; then
    subs="${subs},_VITE_AUTH0_CLIENT_ID=${auth0_client_id}"
  fi
  
  if [ -n "${auth0_audience}" ]; then
    subs="${subs},_VITE_AUTH0_AUDIENCE=${auth0_audience}"
  fi
  
  echo "${subs}"
}

# Deploy backend only
deploy_backend() {
  echo -e "${BLUE}🚀 Deploying backend...${NC}"
  cd backend
  
  echo -e "${BLUE}📦 Building backend Docker image...${NC}"
  gcloud builds submit --tag gcr.io/${PROJECT_ID}/${SERVICE_BACKEND} --project=${PROJECT_ID}
  
  # Get frontend URL if it exists (for CORS configuration)
  local frontend_url=$(gcloud run services describe ${SERVICE_FRONTEND} \
    --region ${REGION} \
    --format="value(status.url)" 2>/dev/null || echo "")
  
  # Build env vars
  local env_vars="NODE_ENV=production,GCP_SECRET_MANAGER_ENABLED=true,GCP_PROJECT_ID=${PROJECT_ID},DATABASE_HOST=/cloudsql/${PROJECT_ID}:${REGION}:${DATABASE_INSTANCE},DATABASE_NAME=${DATABASE_NAME},DATABASE_USER=postgres"
  
  # Add frontend URL if available
  if [ -n "${frontend_url}" ]; then
    env_vars="${env_vars},FRONTEND_URL=${frontend_url}"
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
    --set-env-vars ${env_vars} \
    --add-cloudsql-instances ${PROJECT_ID}:${REGION}:${DATABASE_INSTANCE} \
    --project=${PROJECT_ID}
  
  cd ..
  echo -e "${GREEN}✅ Backend deployed successfully!${NC}"
}

# Deploy frontend only
deploy_frontend() {
  echo -e "${BLUE}🚀 Deploying frontend...${NC}"
  cd frontend
  
  # Get backend URL for frontend API configuration
  local backend_url=$(get_backend_url)
  if [ -z "${backend_url}" ]; then
    echo -e "${YELLOW}⚠️  Backend URL not found. Using default Cloud Run URL pattern.${NC}"
    backend_url="https://${SERVICE_BACKEND}-${PROJECT_ID}.a.run.app"
  else
    echo -e "${BLUE}   Using backend URL: ${backend_url}${NC}"
  fi
  
  # Get Auth0 secrets
  local auth0_secrets=$(get_auth0_secrets)
  local auth0_domain=$(echo "${auth0_secrets}" | cut -d'|' -f1)
  local auth0_client_id=$(echo "${auth0_secrets}" | cut -d'|' -f2)
  local auth0_audience=$(echo "${auth0_secrets}" | cut -d'|' -f3)
  
  # Build substitutions string
  local subs="_FRONTEND_API_URL=${backend_url}"
  if [ -n "${auth0_domain}" ]; then
    subs="${subs},_VITE_AUTH0_DOMAIN=${auth0_domain}"
  fi
  if [ -n "${auth0_client_id}" ]; then
    subs="${subs},_VITE_AUTH0_CLIENT_ID=${auth0_client_id}"
  fi
  if [ -n "${auth0_audience}" ]; then
    subs="${subs},_VITE_AUTH0_AUDIENCE=${auth0_audience}"
  fi
  
  echo -e "${BLUE}📦 Building and pushing frontend Docker image...${NC}"
  gcloud builds submit --config=cloudbuild.yaml \
    --substitutions="${subs}" \
    --project=${PROJECT_ID}
  
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
    --max-instances 10 \
    --project=${PROJECT_ID}
  
  cd ..
  echo -e "${GREEN}✅ Frontend deployed successfully!${NC}"
}

# Run migrations only
run_migrations() {
  echo -e "${BLUE}📦 Running database migrations...${NC}"
  
  # Create a minimal Cloud Build config for migrations
  cat > /tmp/migrations-build.yaml <<EOF
steps:
  - name: 'node:20'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        cd backend
        npm ci --production=false
        
        # Download and start Cloud SQL Proxy
        echo "Downloading Cloud SQL Proxy..."
        wget -q https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64 -O cloud-sql-proxy
        chmod +x cloud-sql-proxy
        
        echo "Starting Cloud SQL Proxy in background..."
        ./cloud-sql-proxy \$PROJECT_ID:us-central1:${DATABASE_INSTANCE} --port=5432 > /tmp/cloud-sql-proxy.log 2>&1 &
        PROXY_PID=\$\$!
        
        # Wait for proxy to be ready
        echo "Waiting for Cloud SQL Proxy to be ready..."
        for i in {1..30}; do
          if grep -q "ready for new connections" /tmp/cloud-sql-proxy.log 2>/dev/null; then
            echo "Cloud SQL Proxy is ready!"
            sleep 2
            break
          fi
          echo "Attempt \$${i}/30: Proxy not ready, waiting..."
          sleep 1
        done
        
        if ! grep -q "ready for new connections" /tmp/cloud-sql-proxy.log 2>/dev/null; then
          echo "ERROR: Cloud SQL Proxy failed to start"
          cat /tmp/cloud-sql-proxy.log || true
          kill $${PROXY_PID} 2>/dev/null || true
          exit 1
        fi
        
        echo "Running migrations..."
        npm run migration:run
        MIGRATION_EXIT=$$?
        
        kill $${PROXY_PID} 2>/dev/null || true
        exit $${MIGRATION_EXIT}
    env:
      - 'NODE_ENV=production'
      - 'DATABASE_HOST=127.0.0.1'
      - 'DATABASE_PORT=5432'
      - 'DATABASE_NAME=${DATABASE_NAME}'
      - 'DATABASE_USER=postgres'
      - 'GCP_SECRET_MANAGER_ENABLED=true'
      - 'GCP_PROJECT_ID=$PROJECT_ID'
    secretEnv: ['DATABASE_PASSWORD']

options:
  machineType: 'E2_HIGHCPU_8'
  logging: CLOUD_LOGGING_ONLY

timeout: '600s'

availableSecrets:
  secretManager:
    - versionName: projects/\$\$PROJECT_ID/secrets/database-password/versions/latest
      env: 'DATABASE_PASSWORD'
EOF
  
  gcloud builds submit --config=/tmp/migrations-build.yaml --project=${PROJECT_ID}
  rm -f /tmp/migrations-build.yaml
  
  echo -e "${GREEN}✅ Migrations completed!${NC}"
}

# Run seeders only
run_seeders() {
  echo -e "${BLUE}📦 Running database seeders...${NC}"
  
  # Create a minimal Cloud Build config for seeders
  cat > /tmp/seeders-build.yaml <<EOF
steps:
  - name: 'node:20'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        cd backend
        npm ci --production=false
        
        # Download and start Cloud SQL Proxy
        echo "Downloading Cloud SQL Proxy..."
        wget -q https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64 -O cloud-sql-proxy
        chmod +x cloud-sql-proxy
        
        echo "Starting Cloud SQL Proxy in background..."
        ./cloud-sql-proxy \$PROJECT_ID:us-central1:${DATABASE_INSTANCE} --port=5432 > /tmp/cloud-sql-proxy.log 2>&1 &
        PROXY_PID=\$\$!
        
        # Wait for proxy to be ready
        echo "Waiting for Cloud SQL Proxy to be ready..."
        for i in {1..30}; do
          if grep -q "ready for new connections" /tmp/cloud-sql-proxy.log 2>/dev/null; then
            echo "Cloud SQL Proxy is ready!"
            sleep 2
            break
          fi
          echo "Attempt \$${i}/30: Proxy not ready, waiting..."
          sleep 1
        done
        
        if ! grep -q "ready for new connections" /tmp/cloud-sql-proxy.log 2>/dev/null; then
          echo "ERROR: Cloud SQL Proxy failed to start"
          cat /tmp/cloud-sql-proxy.log || true
          kill $${PROXY_PID} 2>/dev/null || true
          exit 1
        fi
        
        echo "Running seeders..."
        npm run seed:run
        SEEDER_EXIT=$$?
        
        kill $${PROXY_PID} 2>/dev/null || true
        exit $${SEEDER_EXIT}
    env:
      - 'NODE_ENV=production'
      - 'DATABASE_HOST=127.0.0.1'
      - 'DATABASE_PORT=5432'
      - 'DATABASE_NAME=${DATABASE_NAME}'
      - 'DATABASE_USER=postgres'
      - 'GCP_SECRET_MANAGER_ENABLED=true'
      - 'GCP_PROJECT_ID=$PROJECT_ID'
    secretEnv: ['DATABASE_PASSWORD']

options:
  machineType: 'E2_HIGHCPU_8'
  logging: CLOUD_LOGGING_ONLY

timeout: '600s'

availableSecrets:
  secretManager:
    - versionName: projects/\$\$PROJECT_ID/secrets/database-password/versions/latest
      env: 'DATABASE_PASSWORD'
EOF
  
  gcloud builds submit --config=/tmp/seeders-build.yaml --project=${PROJECT_ID}
  rm -f /tmp/seeders-build.yaml
  
  echo -e "${GREEN}✅ Seeders completed!${NC}"
}

# Deploy everything (full deployment)
deploy_all() {
  echo -e "${BLUE}🚀 Deploying everything...${NC}"
  echo ""
  
  # Get current backend URL (may not exist on first deployment, that's ok)
  # After backend is deployed, we'll use the new URL for frontend build
  local backend_url=$(get_backend_url)
  if [ -z "${backend_url}" ]; then
    # If backend doesn't exist yet, use the expected Cloud Run URL pattern
    backend_url="https://${SERVICE_BACKEND}-${PROJECT_ID}.a.run.app"
    echo -e "${YELLOW}⚠️  Backend not deployed yet. Will use: ${backend_url}${NC}"
  fi
  
  local auth0_secrets=$(get_auth0_secrets)
  local auth0_domain=$(echo "${auth0_secrets}" | cut -d'|' -f1)
  local auth0_client_id=$(echo "${auth0_secrets}" | cut -d'|' -f2)
  local auth0_audience=$(echo "${auth0_secrets}" | cut -d'|' -f3)
  
  local subs=$(build_substitutions "${backend_url}" "${auth0_domain}" "${auth0_client_id}" "${auth0_audience}")
  
  echo -e "${BLUE}Running full deployment via Cloud Build...${NC}"
  echo -e "${BLUE}Steps: build-backend → push-backend → migrations → seeders → deploy-backend → build-frontend → deploy-frontend${NC}"
  echo ""
  
  gcloud builds submit --config=cloudbuild.yaml \
    --substitutions="${subs}" \
    --project=${PROJECT_ID}
  
  echo ""
  echo -e "${GREEN}✅ Full deployment completed!${NC}"
  
  # Display service URLs
  display_service_urls
}

# Display service URLs
display_service_urls() {
  echo ""
  echo -e "${BLUE}Service URLs:${NC}"
  
  local backend_url=$(get_backend_url)
  if [ -n "${backend_url}" ]; then
    echo -e "${GREEN}Backend: ${backend_url}${NC}"
  else
    echo -e "${YELLOW}Backend: Not deployed yet${NC}"
  fi
  
  local frontend_url=$(gcloud run services describe ${SERVICE_FRONTEND} \
    --region ${REGION} \
    --format="value(status.url)" 2>/dev/null || echo "")
  if [ -n "${frontend_url}" ]; then
    echo -e "${GREEN}Frontend: ${frontend_url}${NC}"
  else
    echo -e "${YELLOW}Frontend: Not deployed yet${NC}"
  fi
}

# Parse command line argument
DEPLOY_TARGET=${1:-all}

case $DEPLOY_TARGET in
  backend)
    deploy_backend
    display_service_urls
    ;;
  frontend)
    deploy_frontend
    display_service_urls
    ;;
  migrations|migration)
    run_migrations
    ;;
  seeders|seeder)
    run_seeders
    ;;
  all|"")
    deploy_all
    ;;
  *)
    echo -e "${YELLOW}Usage: ./deploy.sh [backend|frontend|migrations|seeders|all]${NC}"
    echo ""
    echo -e "${BLUE}Options:${NC}"
    echo -e "  backend    - Deploy backend only (build, push, deploy)"
    echo -e "  frontend   - Deploy frontend only (build, push, deploy)"
    echo -e "  migrations - Run database migrations only"
    echo -e "  seeders    - Run database seeders only"
    echo -e "  all        - Full deployment (default): backend → migrations → seeders → frontend"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}🎉 Done!${NC}"
