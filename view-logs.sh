#!/bin/bash

# View Cloud Run logs in a readable format

PROJECT_ID="verusware"
REGION="us-central1"
SERVICE_NAME="kansas-beta-backend"

echo "📋 Recent Cloud Run logs for ${SERVICE_NAME}"
echo "=========================================="
echo ""

# Show database configuration logs
echo "🔍 Database Configuration (startup logs):"
echo "----------------------------------------"
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME} AND (textPayload=~\"Database\" OR jsonPayload.message=~\"Database\")" \
  --project=${PROJECT_ID} \
  --limit=10 \
  --format="table(timestamp,textPayload,jsonPayload.message)" \
  --freshness=24h 2>/dev/null || echo "No database logs found"
echo ""

# Show errors
echo "❌ Recent Errors:"
echo "----------------"
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME} AND severity>=ERROR" \
  --project=${PROJECT_ID} \
  --limit=20 \
  --format="table(timestamp,severity,textPayload,jsonPayload.message,jsonPayload.msg)" \
  --freshness=24h 2>/dev/null || echo "No errors found"
echo ""

# Show newsletter-related logs
echo "📰 Newsletter Service Logs:"
echo "---------------------------"
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME} AND (textPayload=~\"newsletter\" OR jsonPayload.msg=~\"newsletter\" OR jsonPayload.context=~\"NewslettersService\")" \
  --project=${PROJECT_ID} \
  --limit=20 \
  --format="table(timestamp,severity,textPayload,jsonPayload.msg,jsonPayload.message)" \
  --freshness=24h 2>/dev/null || echo "No newsletter logs found"
echo ""

echo "💡 For full logs, visit the GCP Console:"
echo "https://console.cloud.google.com/run?project=${PROJECT_ID}"
echo ""
echo "Or use Logs Explorer:"
echo "https://console.cloud.google.com/logs/query?project=${PROJECT_ID}"

