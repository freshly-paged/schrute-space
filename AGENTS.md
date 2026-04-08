# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Multiplayer 3D virtual office ("Schrute Space") — single-process Node.js server (`server.ts`) running Express + Socket.IO + Vite dev middleware on port 8080.

### Running the dev server

Use `LOCAL_TEST=1` mode for development (no external services required):

```bash
LOCAL_TEST=1 LOCAL_TEST_TTL_MS=0 npx tsx server.ts
```

Or equivalently `npm run dev:local-test`, but note that the default TTL auto-shuts down after 3 minutes. Set `LOCAL_TEST_TTL_MS=0` to keep it running indefinitely.

The server runs on **port 8080**. Each browser profile gets its own mock user via cookie.

### Key commands

See `CLAUDE.md` for the full command reference. Summary:

- **Lint**: `npm run lint` (runs `tsc --noEmit`)
- **Build**: `npm run build` (Vite production build)
- **Dev server**: `npm run dev:local-test` (in-memory DB, no PostgreSQL)

There is no automated test suite.

### Gotchas

- The `.env.local` file is loaded by `dotenv` automatically. In `LOCAL_TEST` mode, no env vars are required.
- The `@tailwindcss/oxide-darwin-arm64` package is in `optionalDependencies` and will show warnings on Linux — this is safe to ignore.
- The Vite build produces a chunk >500 kB warning — this is expected and not an error.
