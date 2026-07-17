#!/bin/bash

# Kansas Beta - Woogle AI nightly reindex backstop
#
# Keeps the Woogle knowledge base fresh automatically, without anyone having to
# remember to click "reindex" in the admin panel. Write-through hooks already
# index people/calendar/newsletters/etc. in near-real-time; this is the safety
# net that guarantees the index can never drift more than ~24h even if a hook
# fails, a bulk import bypasses hooks, rows are edited directly in the DB, or the
# chunk format changes and needs re-embedding.
#
# It provisions:
#   1. A Secret Manager secret (REINDEX_TRIGGER_TOKEN) — the shared secret the
#      backend checks on the unauthenticated cron endpoint.
#   2. A Cloud Scheduler job that POSTs to the backend's /ask/reindex/scheduled
#      endpoint nightly, sending the secret in an X-Reindex-Token header.
#
# This mirrors the pattern in setup-backups.sh (Cloud Scheduler -> HTTP).
#
# IMPORTANT: After creating/rotating the secret, redeploy the backend so it
# picks up REINDEX_TRIGGER_TOKEN (deploy.sh / cloudbuild.yaml already wire it).
#
# Safe to re-run: every step is idempotent. The secret is only created once;
# pass --rotate to generate a fresh value.
#
# Usage: ./setup-woogle-reindex.sh [--rotate]

set -e

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

if ! command -v gcloud &> /dev/null; then
  echo -e "${RED}Error: gcloud CLI not found. Please ensure it's installed and in your PATH.${NC}"
  exit 1
fi

# ----------------------------------------------------------------------------
# Configuration
# ----------------------------------------------------------------------------
PROJECT_ID="verusware"
REGION="us-central1"
SERVICE_BACKEND="kansas-beta-backend"

SECRET_NAME="reindex-trigger-token"

SCHEDULER_SA="kansas-beta-woogle-reindex"
SCHEDULER_SA_EMAIL="${SCHEDULER_SA}@${PROJECT_ID}.iam.gserviceaccount.com"

SCHEDULER_JOB="kansas-beta-woogle-nightly-reindex"
# 09:00 UTC ~ 4:00am Central — low traffic, and after the 08:00 UTC DB export.
SCHEDULE_CRON="0 9 * * *"
TIME_ZONE="Etc/UTC"

ROTATE=false
if [ "$1" == "--rotate" ]; then
  ROTATE=true
fi

echo -e "${BLUE}🔁 Setting up Woogle nightly reindex backstop...${NC}"
echo ""

# ----------------------------------------------------------------------------
# Step 1: Enable required APIs
# ----------------------------------------------------------------------------
echo -e "${BLUE}Step 1: Enabling required APIs...${NC}"
for api in "cloudscheduler.googleapis.com" "secretmanager.googleapis.com" "run.googleapis.com"; do
  gcloud services enable "${api}" --project="${PROJECT_ID}"
done
echo -e "${GREEN}✅ APIs enabled${NC}"
echo ""

# ----------------------------------------------------------------------------
# Step 2: Create / rotate the shared-secret trigger token
# ----------------------------------------------------------------------------
echo -e "${BLUE}Step 2: Ensuring trigger-token secret (${SECRET_NAME})...${NC}"
SECRET_EXISTS=false
if gcloud secrets describe "${SECRET_NAME}" --project="${PROJECT_ID}" &>/dev/null; then
  SECRET_EXISTS=true
fi

if [ "${SECRET_EXISTS}" = false ]; then
  gcloud secrets create "${SECRET_NAME}" --project="${PROJECT_ID}" --replication-policy="automatic"
  echo -e "${GREEN}✅ Secret created${NC}"
fi

if [ "${SECRET_EXISTS}" = false ] || [ "${ROTATE}" = true ]; then
  NEW_TOKEN="$(openssl rand -hex 32)"
  printf '%s' "${NEW_TOKEN}" | gcloud secrets versions add "${SECRET_NAME}" --project="${PROJECT_ID}" --data-file=-
  echo -e "${GREEN}✅ New token version added${NC}"
  echo -e "${YELLOW}   Redeploy the backend so it picks up the new token (deploy.sh backend).${NC}"
else
  echo -e "${YELLOW}Secret already exists — reusing current value (pass --rotate to regenerate).${NC}"
fi

# Read the current token value to embed in the scheduler header.
TOKEN_VALUE="$(gcloud secrets versions access latest --secret="${SECRET_NAME}" --project="${PROJECT_ID}")"
if [ -z "${TOKEN_VALUE}" ]; then
  echo -e "${RED}❌ Could not read the trigger token value.${NC}"
  exit 1
fi
echo ""

# ----------------------------------------------------------------------------
# Step 3: Resolve the backend URL
# ----------------------------------------------------------------------------
echo -e "${BLUE}Step 3: Resolving backend Cloud Run URL...${NC}"
BACKEND_URL="$(gcloud run services describe "${SERVICE_BACKEND}" \
  --region "${REGION}" --project="${PROJECT_ID}" \
  --format="value(status.url)" 2>/dev/null || echo "")"

if [ -z "${BACKEND_URL}" ]; then
  echo -e "${RED}❌ Could not resolve the backend URL. Is ${SERVICE_BACKEND} deployed?${NC}"
  exit 1
fi
REINDEX_URI="${BACKEND_URL}/ask/reindex/scheduled"
echo -e "${GREEN}✅ Target: ${REINDEX_URI}${NC}"
echo ""

# ----------------------------------------------------------------------------
# Step 4: Service account for the scheduler job (for audit/identity)
# ----------------------------------------------------------------------------
echo -e "${BLUE}Step 4: Ensuring Cloud Scheduler service account...${NC}"
if gcloud iam service-accounts describe "${SCHEDULER_SA_EMAIL}" --project="${PROJECT_ID}" &>/dev/null; then
  echo -e "${YELLOW}Service account already exists.${NC}"
else
  gcloud iam service-accounts create "${SCHEDULER_SA}" \
    --project="${PROJECT_ID}" \
    --display-name="Kansas Beta Woogle nightly reindex trigger"
  echo -e "${GREEN}✅ Service account created${NC}"
fi
echo ""

# ----------------------------------------------------------------------------
# Step 5: Cloud Scheduler job (nightly reindex)
# ----------------------------------------------------------------------------
echo -e "${BLUE}Step 5: Creating/updating Cloud Scheduler job...${NC}"
if gcloud scheduler jobs describe "${SCHEDULER_JOB}" --location="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
  echo -e "${YELLOW}Job exists — updating...${NC}"
  gcloud scheduler jobs update http "${SCHEDULER_JOB}" \
    --location="${REGION}" \
    --project="${PROJECT_ID}" \
    --schedule="${SCHEDULE_CRON}" \
    --time-zone="${TIME_ZONE}" \
    --uri="${REINDEX_URI}" \
    --http-method=POST \
    --headers="Content-Type=application/json,X-Reindex-Token=${TOKEN_VALUE}" \
    --message-body='{}' \
    --attempt-deadline=60s
else
  gcloud scheduler jobs create http "${SCHEDULER_JOB}" \
    --location="${REGION}" \
    --project="${PROJECT_ID}" \
    --schedule="${SCHEDULE_CRON}" \
    --time-zone="${TIME_ZONE}" \
    --uri="${REINDEX_URI}" \
    --http-method=POST \
    --headers="Content-Type=application/json,X-Reindex-Token=${TOKEN_VALUE}" \
    --message-body='{}' \
    --attempt-deadline=60s
fi
echo -e "${GREEN}✅ Cloud Scheduler job '${SCHEDULER_JOB}' ready (${SCHEDULE_CRON} ${TIME_ZONE})${NC}"
echo ""

# ----------------------------------------------------------------------------
# Summary
# ----------------------------------------------------------------------------
echo -e "${GREEN}🎉 Woogle nightly reindex backstop is set up!${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo -e "  Secret:        ${SECRET_NAME} (mounted on backend as REINDEX_TRIGGER_TOKEN)"
echo -e "  Nightly job:   ${SCHEDULER_JOB} @ ${SCHEDULE_CRON} ${TIME_ZONE}"
echo -e "  Endpoint:      ${REINDEX_URI}"
echo ""
echo -e "${YELLOW}If you just created or rotated the secret, redeploy the backend now:${NC}"
echo -e "  ./deploy.sh backend"
echo ""
echo -e "${YELLOW}Test it now (triggers a full reindex immediately):${NC}"
echo -e "  gcloud scheduler jobs run ${SCHEDULER_JOB} --location=${REGION} --project=${PROJECT_ID}"
echo ""
echo -e "${YELLOW}Watch progress (admin) via GET /ask/reindex/status, or backend logs:${NC}"
echo -e "  gcloud run services logs read ${SERVICE_BACKEND} --region ${REGION} --project ${PROJECT_ID}"
echo ""
