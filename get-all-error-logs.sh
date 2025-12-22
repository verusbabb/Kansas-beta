#!/bin/bash

# Get ALL recent logs to see the full error details

PROJECT_ID="verusware"
SERVICE_NAME="kansas-beta-backend"

echo "🔍 Getting ALL recent logs (last 5 minutes) to find error details..."
echo ""

# Get all logs from the last 5 minutes and show textPayload
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME}" \
  --project=${PROJECT_ID} \
  --limit=100 \
  --format=json \
  --freshness=5m \
  | jq -r '.[] | 
    if .textPayload and (.textPayload | contains("Newsletter") or contains("Error") or contains("error") or contains("❌") or contains("Database") or contains("Connection")) then
      "[" + .timestamp + "] " + (.severity // "INFO") + "\n" + .textPayload + "\n" + ("-" * 60) + "\n"
    else
      empty
    end
  '

echo ""
echo "🔍 Also checking for any error-related JSON payloads..."
echo ""

# Get error JSON payloads
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME} AND (jsonPayload.msg=~\"Failed\" OR jsonPayload.context=~\"NewslettersService\")" \
  --project=${PROJECT_ID} \
  --limit=5 \
  --format=json \
  --freshness=5m \
  | jq -r '.[] | 
    "[" + .timestamp + "] " + (.severity // "INFO") + "\n" + 
    (.jsonPayload | tostring) + "\n" + 
    ("=" * 60) + "\n"
  '

