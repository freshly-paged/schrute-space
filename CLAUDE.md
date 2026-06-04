# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install                              # Install dependencies
npm run dev                              # Start dev server with PostgreSQL (port 8080)
npm run dev:local-test                   # Start dev server with in-memory DB (no PostgreSQL needed)
LOCAL_TEST=1 LOCAL_TEST_TTL_MS=0 tsx server.ts  # Local test mode that won't auto-shutdown after 3 min
npm run build                            # Vite production build to dist/
npm run lint                             # TypeScript type-check (tsc --noEmit)
npm run clean                            # Remove dist/
npm run test                             # Run all tests once
npm run test:watch                       # Run tests in watch mode
npm run test:coverage                    # Run tests with coverage report
npm run test:integration                 # Run only integration tests
```

To run a single test file: `npx vitest run src/__tests__/unit/constants.test.ts`

## Environment Setup

Copy `.env.example` to `.env.local` and populate:
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth credentials
- `SESSION_SECRET` — Express session + JWT signing secret
- `APP_URL` — Canonical app URL (used for OAuth redirect URI construction)
- `GEMINI_API_KEY` — Google Gemini API key (injected into Vite build via `vite.config.ts`)
- `DATABASE_URL` — PostgreSQL connection string; server auto-creates `users` and `room_layouts` tables on startup
- `LOCAL_TEST=1` — Skip PostgreSQL entirely; uses `server/memoryDb.ts` in-memory DB with mock players and TTL-based exit

For local dev without Docker/PostgreSQL, `npm run dev:local-test` is the fastest path. Each browser profile gets its own mock user via an HttpOnly cookie.

To simulate multiple players: use Incognito + a normal window (or two different browser profiles) pointing to the same `?room=...` URL. Extra tabs in the same profile share one user.

## Architecture

**Single-process dev server** (`server.ts`): Express + Socket.IO server that also runs Vite as middleware. In production, serves static `dist/` files. Always runs on port 8080. Per-room layout mutations (desk ensure, save, kick) are serialized to prevent race conditions. Exports `createApp(pool)` — used by integration tests to inject a mock pg.Pool without starting a real server.

**Auth flow** (`src/hooks/useAuth.ts`): Google OAuth via popup window. On success, the popup stores a JWT in `localStorage` (`office_auth_token`) and sends a `postMessage` to the opener. The hook polls `/api/auth/me` until logged in, and authenticates the Socket.IO connection using `socket.handshake.auth.token`. Single-session enforcement: connecting with the same email disconnects the previous socket with a `forceDisconnect` event.

**Multiplayer rooms** (`src/hooks/useSocket.ts`): Server maintains `rooms: Record<roomId, Record<socketId, PlayerState>>`. Room is passed via `?room=<id>` URL query param. Players join by emitting `joinRoom`. Movement is synced via `playerMovement` events; chat via `chatMessage`. The hook owns all socket lifecycle, player state, and chat history. Also handles focus energy sync (`focusEnergySync` event) and throwable/ice-cream state.

**App.tsx**: Thin orchestrator — composes `useAuth` + `useSocket`, manages `currentRoom`, and renders the appropriate screen (loading → disconnected → login → room select → game → customize-office). Polls for focus-complete feedback via `useFocusSessionCompleteFeedback`.

**3D world** (`src/components/`): React Three Fiber (`@react-three/fiber`) + Drei. The `Canvas` is set up in `App.tsx`.
- `player/LocalPlayer.tsx` — Camera-relative WASD movement, desk snapping during focus. Physics delegated to `usePlayerPhysics`. Handles overlay text depth (always on top of geometry).
- `player/OtherPlayer.tsx` — Renders remote players from socket state.
- `player/CharacterAvatar.tsx` — Animated 3D character mesh (walk/jump/roll/focus-sit poses).
- `world/OfficeEnvironment.tsx` — Room orchestrator; renders desks from `roomLayout` store state (dynamic, not from constants). Also renders sub-rooms.
- `world/working-area/Desk.tsx` — Desk + proximity detection; shows "[E] to Start Focus" prompt via `nearestDeskId` in store. Renders desk nameplate with owner display name / job title.
- `world/ThrowableObject.tsx` — Interactable prop that can be picked up, thrown, or worn. State is synced across players via socket.

**Physics hook** (`src/hooks/usePlayerPhysics.ts`): Encapsulates all movement refs and logic — `processJump` (double jump), `processRoll` (double-tap W), `tickRoll`, `applyGravity`, `applyMovement` (axis-separated collision tests against `COLLISION_BOXES` and other players). Parkour moves consume focus energy and are blocked if energy is below `PARKOUR_MIN_ENERGY_REQUIRED`.

**Focus energy system** (`src/focusEnergyModel.ts`): Shared client+server module. Energy (0–100) drains at 2/min during focus sessions and regens at 5/min while idle. Chair upgrade level adds up to `FOCUS_ENERGY_SEATED_REGEN_MAX_PER_MIN` additional regen per minute while seated. Below 40% (`FOCUS_ENERGY_FULL_EFFECT_MIN_RATIO`), walk speed and ream earn rate scale down. Parkour costs 5 energy per move; minimum 20 required. Energy is persisted per-user in DB and synced on connect/disconnect.

**Game state** (`src/store/useGameStore.ts`): Zustand store holding Pomodoro timer state, paper reams (passive income during focus sessions), nearest/active desk IDs, chat focus flag, `roomLayout` (the live `FurnitureItem[]` for the current room), chair/monitor upgrade levels per desk owner, throwable/worn prop state, water cooler buff, focus energy, and player profile (display name, job title). Timer integration: pressing E at a desk starts a 25-min focus timer that locks movement to the desk chair; paper accumulates at an energy-scaled rate (1 ream per 30s at full energy).

**Office layout system**: Desk positions are stored per-room in the `room_layouts` PostgreSQL table as a JSONB array of `FurnitureItem` objects. On `joinRoom`, the server calls `ensurePlayerDesk` (auto-creates a desk for new players at a grid spawn position) and emits `roomLayoutLoaded`. When any player saves a new layout via `POST /api/room-layout`, the server broadcasts `roomLayoutUpdated` to all players in the room. The `FurnitureItem` / `DeskItem` types in `src/types.ts` are extensible — future furniture types only require new render branches, no DB schema changes.

**Upgrade system**:
- **Chair upgrades** (`src/chairUpgradeConstants.ts`): Boosts seated focus energy regen during desk sessions.
- **Monitor upgrades** (`src/monitorUpgradeConstants.ts`): Boosts paper ream earn rate during focus (`focusReamsPerMinute`).
- Upgrade levels are stored per-user in DB and synced to all room members via socket on join and on purchase.

**Constants** (`src/constants.ts`): `DESKS` array is kept as a legacy reference but is no longer used at runtime — desks are loaded dynamically from the DB. `COLLISION_BOXES` (`THREE.Box3` array for the entire office) and deterministic player color assignment by name hash remain in active use.

**Office layout positions** (`src/officeLayout.ts`): Canonical world-space positions for sub-room groups and interactable props — shared between client and server to avoid drift.

**Local test mode** (`server/memoryDb.ts`): When `LOCAL_TEST=1`, the server skips PostgreSQL and uses an in-memory store with mock players seeded at 1000 reams. Players are automatically evicted after a TTL with no connected socket. Default TTL is 3 minutes (server auto-shuts down); set `LOCAL_TEST_TTL_MS=0` to disable.

**Styling**: Tailwind CSS v4 via `@tailwindcss/vite` plugin. No tailwind config file — configuration is implicit. Custom pixel-art CSS classes (`pixel-border`, `pixel-button`, `font-pixel`) are defined in `src/index.css`.

## Testing

Tests live in `src/__tests__/`, split into `unit/` and `integration/`.

**Integration tests** (`src/__tests__/integration/server.test.ts`): Inject a mock `pg.Pool` into `createApp()` — no real database needed. Auth is bypassed via the `DEV_USER_EMAIL` env variable. Socket.IO tests spin up the HTTP server on a random port (`listen(0)`) and connect a real `socket.io-client` to exercise the full event pipeline.

**Unit tests** (`src/__tests__/unit/`): Cover constants, game store, player physics, and React components. `three` is inlined through Vite's transform pipeline (`server.deps.inline: ['three']` in `vitest.config.ts`) so `vi.mock('three')` works reliably. The test environment is `happy-dom` (required because `useGameStore` calls `localStorage` during module initialization).

## Gotchas

- `@tailwindcss/oxide-darwin-arm64` is in `optionalDependencies` and will show warnings on Linux — safe to ignore.
- The Vite build produces a chunk >500 kB warning — expected, not an error.
- `src/constants.ts` exports a `DESKS` array that looks authoritative but is **not used at runtime** — actual desk layout comes from the DB.
