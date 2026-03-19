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
   - `APP_URL` — `http://localhost:8080`
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
   App runs at `http://localhost:8080`.


### Stopping / restarting the database

```bash
docker stop schrute-postgres   # stop
docker start schrute-postgres  # restart (data persists)
docker rm schrute-postgres     # remove container entirely
```

---

### Deployment
Automatically deployed when changes to main branch is detected.
