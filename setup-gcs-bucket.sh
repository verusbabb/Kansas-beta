#!/bin/bash

# Script to set up Cloud Storage bucket and secret for newsletter PDFs
# Project: verusware
# Bucket: kansas-beta-newsletter-pdfs
# Region: us-central1

set -e  # Exit on error

# Configuration
PROJECT_ID="verusware"
BUCKET_NAME="kansas-beta-newsletter-pdfs"
REGION="us-central1"
SECRET_NAME="gcs-bucket-name"

echo "🚀 Setting up Cloud Storage bucket and secret..."
echo ""

# Step 1: Create the Cloud Storage bucket
echo "Step 1: Creating Cloud Storage bucket '${BUCKET_NAME}'..."
if gsutil ls -b gs://${BUCKET_NAME} &>/dev/null; then
  echo "✅ Bucket '${BUCKET_NAME}' already exists."
else
  gsutil mb -p ${PROJECT_ID} -l ${REGION} gs://${BUCKET_NAME}
  echo "✅ Bucket created successfully."
fi
echo ""

# Step 2: Set bucket to private (we use signed URLs, so bucket should be private)
echo "Step 2: Ensuring bucket is private (using signed URLs for access)..."
# Remove public access if it exists (this will error if already private, which is fine)
# Using gsutil iam set to ensure bucket is private
gsutil iam ch -d allUsers:objectViewer "gs://${BUCKET_NAME}" 2>/dev/null || true
echo "✅ Bucket is private (access via signed URLs only)."
echo ""

# Step 3: Create the secret in Secret Manager
echo "Step 3: Creating secret '${SECRET_NAME}' in Secret Manager..."
if gcloud secrets describe ${SECRET_NAME} --project=${PROJECT_ID} &>/dev/null; then
  echo "⚠️  Secret '${SECRET_NAME}' already exists."
  read -p "Do you want to update it with the new bucket name? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -n "${BUCKET_NAME}" | gcloud secrets versions add ${SECRET_NAME} --data-file=- --project=${PROJECT_ID}
    echo "✅ Secret updated successfully."
  else
    echo "ℹ️  Secret not updated. Using existing value."
  fi
else
  echo -n "${BUCKET_NAME}" | gcloud secrets create ${SECRET_NAME} --data-file=- --project=${PROJECT_ID}
  echo "✅ Secret created successfully."
fi
echo ""

# Step 4: Get Cloud Run service account and grant permissions
echo "Step 4: Granting Cloud Storage permissions to Cloud Run service account..."
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "   Service account: ${SERVICE_ACCOUNT}"

# Grant Storage Object Admin role (allows create, read, delete, and generate signed URLs)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/storage.objectAdmin" \
  --condition=None

echo "✅ Permissions granted successfully."
echo ""

# Step 5: Verify setup
echo "Step 5: Verifying setup..."
echo ""
echo "📋 Verification:"
echo "   Bucket exists: $(gsutil ls -b gs://${BUCKET_NAME} &>/dev/null && echo '✅ Yes' || echo '❌ No')"
echo "   Secret exists: $(gcloud secrets describe ${SECRET_NAME} --project=${PROJECT_ID} &>/dev/null && echo '✅ Yes' || echo '❌ No')"
echo ""

# Get secret value for verification
SECRET_VALUE=$(gcloud secrets versions access latest --secret=${SECRET_NAME} --project=${PROJECT_ID})
echo "   Secret value: ${SECRET_VALUE}"
echo ""

echo "✅ Setup complete!"
echo ""
echo "📝 Summary:"
echo "   • Bucket: gs://${BUCKET_NAME}"
echo "   • Secret: ${SECRET_NAME} = ${SECRET_VALUE}"
echo "   • Service account: ${SERVICE_ACCOUNT}"
echo ""
echo "⚠️  Next steps:"
echo "   1. Add GCS_BUCKET_NAME=${BUCKET_NAME} to your local backend/.env file"
echo "   2. Deploy the backend to Cloud Run (it will use the secret automatically)"
echo ""

