<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

## Local Development

### Prerequisites

- Node.js
- Docker (for PostgreSQL)

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the example env file and fill in your credentials:
   ```bash
   cp .env.example .env.local
   ```
   Required values in `.env.local`:
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth credentials
   - `SESSION_SECRET` — any random string
   - `APP_URL` — `http://localhost:3000`
   - `GEMINI_API_KEY` — Google Gemini API key
   - `DATABASE_URL` — `postgresql://postgres:password@localhost:5432/schrute_space`

3. Start a local PostgreSQL container:
   ```bash
   docker run -d \
     --name schrute-postgres \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=password \
     -e POSTGRES_DB=schrute_space \
     -p 5432:5432 \
     postgres:16
   ```

4. Start the dev server:
   ```bash
   npm run dev
   ```
   App runs at `http://localhost:3000`.


### Stopping / restarting the database

```bash
docker stop schrute-postgres   # stop
docker start schrute-postgres  # restart (data persists)
docker rm schrute-postgres     # remove container entirely
```

---

## Deploying to Google Cloud

### Prerequisites

- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
  ```bash
  brew install --cask google-cloud-sdk
  gcloud init   # authenticate and select project
  ```
- Project ID: `jlcai-aistudio-sandbox-167950`

### First-time database setup (Cloud SQL)

Run once to provision the managed PostgreSQL instance:

```bash
# Create the instance (takes a few minutes)
gcloud sql instances create schrute-space-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --project=jlcai-aistudio-sandbox-167950

# Set the postgres user password
gcloud sql users set-password postgres \
  --instance=schrute-space-db \
  --password=YOUR_SECURE_PASSWORD \
  --project=jlcai-aistudio-sandbox-167950

# Create the database
gcloud sql databases create schrute_space \
  --instance=schrute-space-db \
  --project=jlcai-aistudio-sandbox-167950

# Get the connection name (save this for the next step)
gcloud sql instances describe schrute-space-db \
  --format="value(connectionName)" \
  --project=jlcai-aistudio-sandbox-167950
# Output: jlcai-aistudio-sandbox-167950:us-central1:schrute-space-db
```

The `DATABASE_URL` for Cloud Run uses a Unix socket:
```
postgresql://postgres:YOUR_SECURE_PASSWORD@localhost/schrute_space?host=/cloudsql/jlcai-aistudio-sandbox-167950:us-central1:schrute-space-db
```

### Deploying code changes

Use the included script to pull the latest code and deploy in one step:

```bash
chmod +x deploy.sh  # first time only
./deploy.sh
```

Or manually:

```bash
gcloud run deploy schrute-space \
  --source . \
  --region=us-central1 \
  --project=jlcai-aistudio-sandbox-167950 \
  --add-cloudsql-instances=jlcai-aistudio-sandbox-167950:us-central1:schrute-space-db \
  --set-env-vars="DATABASE_URL=postgresql://postgres:YOUR_SECURE_PASSWORD@localhost/schrute_space?host=/cloudsql/jlcai-aistudio-sandbox-167950:us-central1:schrute-space-db,APP_URL=https://YOUR_CLOUD_RUN_URL,SESSION_SECRET=YOUR_SECRET,GOOGLE_CLIENT_ID=YOUR_CLIENT_ID,GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET,GEMINI_API_KEY=YOUR_GEMINI_KEY"
```

`gcloud run deploy --source .` builds and deploys in one step using Cloud Build. After the first deploy, Cloud Run gives you a URL — update `APP_URL` and the Google OAuth redirect URI accordingly.

### After deploying

1. Add the Cloud Run URL to **Authorized redirect URIs** in your Google OAuth client:
   `https://YOUR_CLOUD_RUN_URL/auth/google/callback`
2. Update the `APP_URL` env var on the Cloud Run service to match.

### Schema changes

The app runs `CREATE TABLE IF NOT EXISTS` on startup, so new tables are created automatically. For column changes or migrations, connect directly via the Cloud SQL proxy:

```bash
# Install the proxy
brew install cloud-sql-proxy

# Start the proxy
cloud-sql-proxy jlcai-aistudio-sandbox-167950:us-central1:schrute-space-db

# In another terminal, connect with psql
psql "postgresql://postgres:YOUR_SECURE_PASSWORD@localhost:5432/schrute_space"
```
