#!/bin/bash
set -e

# ── Config ────────────────────────────────────────────────────────────────────
PROJECT_ID="jlcai-aistudio-sandbox-167950"
REGION="us-central1"
SERVICE_NAME="schrute-space"
CLOUDSQL_INSTANCE="${PROJECT_ID}:${REGION}:schrute-space-db"

# ── Pull latest changes ───────────────────────────────────────────────────────
echo "Pulling latest changes..."
if [ -n "$GITHUB_USERNAME" ] && [ -n "$GITHUB_TOKEN" ]; then
  REPO_URL=$(git remote get-url origin | sed 's|https://|https://'"$GITHUB_USERNAME"':'"$GITHUB_TOKEN"'@|')
  git pull "$REPO_URL"
else
  git pull
fi

# ── Deploy to Cloud Run ───────────────────────────────────────────────────────
echo "Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --ingress=internal \
  --add-cloudsql-instances="$CLOUDSQL_INSTANCE"

echo "Done! Service URL:"
gcloud run services describe "$SERVICE_NAME" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format="value(status.url)"
