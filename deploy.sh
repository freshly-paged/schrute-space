#!/bin/bash
set -e

# ── Config ────────────────────────────────────────────────────────────────────
PROJECT_ID="jlcai-aistudio-sandbox-167950"
REGION="us-central1"
SERVICE_NAME="schrute-space"
CLOUDSQL_INSTANCE="${PROJECT_ID}:${REGION}:schrute-space-db"

# ── Pull latest changes ───────────────────────────────────────────────────────
echo "Pulling latest changes..."
git pull

# ── Deploy to Cloud Run ───────────────────────────────────────────────────────
echo "Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --add-cloudsql-instances="$CLOUDSQL_INSTANCE"

echo "Done! Service URL:"
gcloud run services describe "$SERVICE_NAME" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format="value(status.url)"
