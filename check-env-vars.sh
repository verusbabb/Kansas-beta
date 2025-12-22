#!/bin/bash

# Check Cloud Run environment variables

PROJECT_ID="verusware"
SERVICE_NAME="kansas-beta-backend"
REGION="us-central1"

echo "🔍 Checking Cloud Run environment variables..."
echo ""

gcloud run services describe ${SERVICE_NAME} \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format="table(spec.template.spec.containers[0].env.name,spec.template.spec.containers[0].env.value)" 2>/dev/null | grep -E "(DATABASE|NAME|VALUE)" || \
gcloud run services describe ${SERVICE_NAME} \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format="value(spec.template.spec.containers[0].env)" | jq -r '.[] | "\(.name)=\(.value)"' | grep DATABASE

