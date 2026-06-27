#!/bin/bash

# Kansas Beta - Off-instance database backup layer
#
# Provisions immutable, off-instance backups that survive even deletion of the
# Cloud SQL instance itself:
#   1. A dedicated GCS bucket (versioned + retention) to hold logical SQL dumps.
#   2. IAM so the Cloud SQL instance can write exports into that bucket.
#   3. A service account + Cloud Scheduler job that triggers a nightly export.
#
# This complements the in-instance protection (automated backups, PITR, deletion
# protection) configured in setup-gcp.sh. Those live WITH the instance; this layer
# is independent, so it covers the "instance got deleted" disaster case.
#
# Safe to re-run: every step is idempotent.
#
# Usage: ./setup-backups.sh

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
DATABASE_INSTANCE="kansas-beta-db"
DATABASE_NAME="kansas_beta"

BUCKET_NAME="${PROJECT_ID}-kansas-beta-db-backups"
BUCKET_URI="gs://${BUCKET_NAME}"

# Service account used by Cloud Scheduler to call the Cloud SQL export API.
SCHEDULER_SA="kansas-beta-db-backup"
SCHEDULER_SA_EMAIL="${SCHEDULER_SA}@${PROJECT_ID}.iam.gserviceaccount.com"

SCHEDULER_JOB="kansas-beta-db-nightly-export"
# 08:00 UTC ~ 3:00am Central — low traffic. (Cron is in TIME_ZONE below.)
SCHEDULE_CRON="0 8 * * *"
TIME_ZONE="Etc/UTC"

# Nightly export overwrites the same object; bucket versioning preserves history.
EXPORT_OBJECT="daily/${DATABASE_NAME}-latest.sql.gz"
# How long noncurrent (overwritten) versions are kept before lifecycle deletes them.
NONCURRENT_RETENTION_DAYS=90
# Minimum time any object version must be retained (immutability window).
RETENTION_PERIOD="30d"

echo -e "${BLUE}🛡️  Setting up off-instance DB backups for ${DATABASE_INSTANCE}...${NC}"
echo ""

# ----------------------------------------------------------------------------
# Step 1: Enable required APIs
# ----------------------------------------------------------------------------
echo -e "${BLUE}Step 1: Enabling required APIs...${NC}"
for api in "sqladmin.googleapis.com" "cloudscheduler.googleapis.com" "storage.googleapis.com"; do
  gcloud services enable "${api}" --project="${PROJECT_ID}"
done
echo -e "${GREEN}✅ APIs enabled${NC}"
echo ""

# ----------------------------------------------------------------------------
# Step 2: Create the backup bucket (versioned + retention)
# ----------------------------------------------------------------------------
echo -e "${BLUE}Step 2: Creating backup bucket ${BUCKET_URI}...${NC}"
if gcloud storage buckets describe "${BUCKET_URI}" --project="${PROJECT_ID}" &>/dev/null; then
  echo -e "${YELLOW}Bucket already exists.${NC}"
else
  gcloud storage buckets create "${BUCKET_URI}" \
    --project="${PROJECT_ID}" \
    --location="${REGION}" \
    --uniform-bucket-level-access \
    --public-access-prevention
  echo -e "${GREEN}✅ Bucket created${NC}"
fi

echo -e "${BLUE}Enabling object versioning...${NC}"
gcloud storage buckets update "${BUCKET_URI}" --versioning

echo -e "${BLUE}Setting retention period (${RETENTION_PERIOD}) for immutability...${NC}"
gcloud storage buckets update "${BUCKET_URI}" --retention-period="${RETENTION_PERIOD}"

echo -e "${BLUE}Applying lifecycle rule (delete noncurrent versions after ${NONCURRENT_RETENTION_DAYS} days)...${NC}"
LIFECYCLE_FILE="$(mktemp)"
cat > "${LIFECYCLE_FILE}" <<EOF
{
  "rule": [
    {
      "action": { "type": "Delete" },
      "condition": { "daysSinceNoncurrentTime": ${NONCURRENT_RETENTION_DAYS} }
    }
  ]
}
EOF
gcloud storage buckets update "${BUCKET_URI}" --lifecycle-file="${LIFECYCLE_FILE}"
rm -f "${LIFECYCLE_FILE}"
echo -e "${GREEN}✅ Bucket configured (versioning + retention + lifecycle)${NC}"
echo ""

# ----------------------------------------------------------------------------
# Step 3: Let the Cloud SQL instance write exports into the bucket
# ----------------------------------------------------------------------------
echo -e "${BLUE}Step 3: Granting the Cloud SQL service account write access...${NC}"
INSTANCE_SA=$(gcloud sql instances describe "${DATABASE_INSTANCE}" \
  --project="${PROJECT_ID}" \
  --format="value(serviceAccountEmailAddress)")

if [ -z "${INSTANCE_SA}" ]; then
  echo -e "${RED}❌ Could not resolve the Cloud SQL instance service account. Is the instance created?${NC}"
  exit 1
fi

gcloud storage buckets add-iam-policy-binding "${BUCKET_URI}" \
  --member="serviceAccount:${INSTANCE_SA}" \
  --role="roles/storage.objectAdmin"
echo -e "${GREEN}✅ ${INSTANCE_SA} can write to the bucket${NC}"
echo ""

# ----------------------------------------------------------------------------
# Step 4: Service account for Cloud Scheduler -> Cloud SQL export API
# ----------------------------------------------------------------------------
echo -e "${BLUE}Step 4: Creating Cloud Scheduler service account...${NC}"
if gcloud iam service-accounts describe "${SCHEDULER_SA_EMAIL}" --project="${PROJECT_ID}" &>/dev/null; then
  echo -e "${YELLOW}Service account already exists.${NC}"
else
  gcloud iam service-accounts create "${SCHEDULER_SA}" \
    --project="${PROJECT_ID}" \
    --display-name="Kansas Beta DB nightly export trigger"
  echo -e "${GREEN}✅ Service account created${NC}"
fi

echo -e "${BLUE}Granting Cloud SQL export permission (roles/cloudsql.editor)...${NC}"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SCHEDULER_SA_EMAIL}" \
  --role="roles/cloudsql.editor" \
  --condition=None >/dev/null
echo -e "${GREEN}✅ Permission granted${NC}"
echo ""

# ----------------------------------------------------------------------------
# Step 5: Cloud Scheduler job (nightly export)
# ----------------------------------------------------------------------------
echo -e "${BLUE}Step 5: Creating/updating Cloud Scheduler job...${NC}"
EXPORT_URI="https://sqladmin.googleapis.com/v1/projects/${PROJECT_ID}/instances/${DATABASE_INSTANCE}/export"
MESSAGE_BODY=$(cat <<EOF
{"exportContext":{"kind":"sql#exportContext","fileType":"SQL","uri":"${BUCKET_URI}/${EXPORT_OBJECT}","databases":["${DATABASE_NAME}"]}}
EOF
)

if gcloud scheduler jobs describe "${SCHEDULER_JOB}" --location="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
  echo -e "${YELLOW}Job exists — updating...${NC}"
  gcloud scheduler jobs update http "${SCHEDULER_JOB}" \
    --location="${REGION}" \
    --project="${PROJECT_ID}" \
    --schedule="${SCHEDULE_CRON}" \
    --time-zone="${TIME_ZONE}" \
    --uri="${EXPORT_URI}" \
    --http-method=POST \
    --headers="Content-Type=application/json" \
    --message-body="${MESSAGE_BODY}" \
    --oauth-service-account-email="${SCHEDULER_SA_EMAIL}"
else
  gcloud scheduler jobs create http "${SCHEDULER_JOB}" \
    --location="${REGION}" \
    --project="${PROJECT_ID}" \
    --schedule="${SCHEDULE_CRON}" \
    --time-zone="${TIME_ZONE}" \
    --uri="${EXPORT_URI}" \
    --http-method=POST \
    --headers="Content-Type=application/json" \
    --message-body="${MESSAGE_BODY}" \
    --oauth-service-account-email="${SCHEDULER_SA_EMAIL}"
fi
echo -e "${GREEN}✅ Cloud Scheduler job '${SCHEDULER_JOB}' ready (${SCHEDULE_CRON} ${TIME_ZONE})${NC}"
echo ""

# ----------------------------------------------------------------------------
# Summary
# ----------------------------------------------------------------------------
echo -e "${GREEN}🎉 Off-instance backup layer is set up!${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo -e "  Bucket:        ${BUCKET_URI} (versioned, ${RETENTION_PERIOD} retention)"
echo -e "  Nightly job:   ${SCHEDULER_JOB} @ ${SCHEDULE_CRON} ${TIME_ZONE}"
echo -e "  Export target: ${BUCKET_URI}/${EXPORT_OBJECT}"
echo ""
echo -e "${YELLOW}Test it now (runs the export immediately):${NC}"
echo -e "  gcloud scheduler jobs run ${SCHEDULER_JOB} --location=${REGION} --project=${PROJECT_ID}"
echo ""
echo -e "${YELLOW}List backup versions:${NC}"
echo -e "  gcloud storage ls -a ${BUCKET_URI}/${EXPORT_OBJECT}"
echo ""
echo -e "${YELLOW}Optional hardening: lock the retention policy (IRREVERSIBLE — makes${NC}"
echo -e "${YELLOW}backups truly immutable, even to admins):${NC}"
echo -e "  gcloud storage buckets update ${BUCKET_URI} --lock-retention-period"
echo ""
