# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (runs server.ts via tsx on port 8080)
npm run build        # Vite production build to dist/
npm run lint         # TypeScript type-check (tsc --noEmit)
npm run clean        # Remove dist/
```

There is no test suite. The dev server integrates both Express+Socket.IO and Vite middleware in a single process via `server.ts`.

## Environment Setup

Copy `.env.example` to `.env.local` and populate:
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth credentials
- `SESSION_SECRET` — Express session + JWT signing secret
- `APP_URL` — Canonical app URL (used for OAuth redirect URI construction)
- `GEMINI_API_KEY` — Google Gemini API key (injected into Vite build via `vite.config.ts`)
- `DATABASE_URL` — PostgreSQL connection string; server auto-creates `users` and `room_layouts` tables on startup
- `LOCAL_TEST=1` — Skip PostgreSQL entirely; uses `server/memoryDb.ts` in-memory DB with mock players and TTL-based exit

## Architecture

**Single-process dev server** (`server.ts`): Express + Socket.IO server that also runs Vite as middleware. In production, serves static `dist/` files. Always runs on port 8080. Per-room layout mutations (desk ensure, save, kick) are serialized to prevent race conditions.

**Auth flow** (`src/hooks/useAuth.ts`): Google OAuth via popup window. On success, the popup stores a JWT in `localStorage` (`office_auth_token`) and sends a `postMessage` to the opener. The hook polls `/api/auth/me` until logged in, and authenticates the Socket.IO connection using `socket.handshake.auth.token`. Single-session enforcement: connecting with the same email disconnects the previous socket with a `forceDisconnect` event.

**Multiplayer rooms** (`src/hooks/useSocket.ts`): Server maintains `rooms: Record<roomId, Record<socketId, PlayerState>>`. Room is passed via `?room=<id>` URL query param. Players join by emitting `joinRoom`. Movement is synced via `playerMovement` events; chat via `chatMessage`. The hook owns all socket lifecycle, player state, and chat history. Also handles focus energy sync (`focusEnergySync` event) and throwable/ice-cream state.

**App.tsx**: Thin orchestrator — composes `useAuth` + `useSocket`, manages `currentRoom`, and renders the appropriate screen (loading → disconnected → login → room select → game → customize-office). Polls for focus-complete feedback via `useFocusSessionCompleteFeedback`.

**3D world** (`src/components/`): React Three Fiber (`@react-three/fiber`) + Drei. The `Canvas` is set up in `App.tsx`.
- `player/LocalPlayer.tsx` — Camera-relative WASD movement, desk snapping during focus. Physics delegated to `usePlayerPhysics`. Handles overlay text depth (always on top of geometry).
- `player/OtherPlayer.tsx` — Renders remote players from socket state.
- `player/CharacterAvatar.tsx` — Animated 3D character mesh (walk/jump/roll/focus-sit poses).
- `player/HeldIceCream.tsx` — Renders the ice cream prop held by the local player.
- `player/OtherPlayerHeldThrowable.tsx` — Renders throwable held by remote players.
- `player/WornMsBody.tsx` — Renders the Michael Scott body suit worn on the avatar.
- `world/OfficeEnvironment.tsx` — Room orchestrator; renders desks from `roomLayout` store state (dynamic, not from constants). Also renders sub-rooms.
- `world/working-area/Desk.tsx` — Desk + proximity detection; shows "[E] to Start Focus" prompt via `nearestDeskId` in store. Renders desk nameplate with owner display name / job title.
- `world/break-room/BreakRoom.tsx` — Break room with vending machine (ice cream), water cooler, and coffee machine props.
- `world/conference-room/ConferenceRoom.tsx` — Conference room with a whiteboard.
- `world/managers-office/ManagersOffice.tsx` — Manager's office with boss desk, Dwight bobblehead, Dundie award, and Michael Scott body suit prop.
- `world/ThrowableObject.tsx` — Interactable prop that can be picked up, thrown, or worn. State is synced across players via socket.
- `ui/HUDPanel.tsx` — Left overlay (stats + controls guide + "Customize Office" button).
- `ui/ChatPanel.tsx` — Right overlay (chat history + input + emotes). Auto-scrolls to latest messages.
- `ui/OfficeCustomizationPage.tsx` — Top-down 2D SVG editor for repositioning desks; desks are draggable with ±45° rotation controls.
- `ui/RoomLeaderboard.tsx` — Leaderboard modal ranked by lifetime paper earned (`total_paper_reams_earned`); polls every 5 minutes.
- `ui/FocusEnergyBar.tsx` — Shared energy bar component (used in HUD and PomodoroUI); shows color-coded fill and optional decay-zone hint.
- `ui/ParkourEnergyHint.tsx` — Toast shown when a parkour move is blocked due to insufficient focus energy.
- `ui/VendingMenu.tsx` — Vending machine interaction menu (ice cream flavors + chair-energy-regen description).
- `ui/AvatarCustomizationPage.tsx` — Avatar appearance editor (shirt color, skin tone, pants).
- `ui/PomodoroUI.tsx` — Focus timer overlay shown during active desk sessions; includes energy bar and paper progress.

**Physics hook** (`src/hooks/usePlayerPhysics.ts`): Encapsulates all movement refs and logic — `processJump` (double jump), `processRoll` (double-tap W), `tickRoll`, `applyGravity`, `applyMovement` (axis-separated collision tests against `COLLISION_BOXES` and other players). Parkour moves (`processJump` double jump, `processRoll`) consume focus energy and are blocked if energy is below `PARKOUR_MIN_ENERGY_REQUIRED`.

**Focus energy system** (`src/focusEnergyModel.ts`): Shared client+server module. Energy (0–100) drains at 2/min during focus sessions and regens at 5/min while idle. Chair upgrade level adds up to `FOCUS_ENERGY_SEATED_REGEN_MAX_PER_MIN` additional regen per minute while seated. Below 40% (`FOCUS_ENERGY_FULL_EFFECT_MIN_RATIO`), walk speed and ream earn rate scale down. Parkour costs 5 energy per move; minimum 20 required. Energy is persisted per-user in DB and synced on connect/disconnect.

**Game state** (`src/store/useGameStore.ts`): Zustand store holding Pomodoro timer state, paper reams (passive income during focus sessions), nearest/active desk IDs, chat focus flag, `roomLayout` (the live `FurnitureItem[]` for the current room), chair/monitor upgrade levels per desk owner, throwable/worn prop state, water cooler buff, focus energy, and player profile (display name, job title). Timer integration: pressing E at a desk starts a 25-min focus timer that locks movement to the desk chair; paper accumulates at an energy-scaled rate (1 ream per 30s at full energy).

**Office layout system**: Desk positions are stored per-room in the `room_layouts` PostgreSQL table as a JSONB array of `FurnitureItem` objects. On `joinRoom`, the server calls `ensurePlayerDesk` (auto-creates a desk for new players at a grid spawn position) and emits `roomLayoutLoaded`. When any player saves a new layout via `POST /api/room-layout`, the server broadcasts `roomLayoutUpdated` to all players in the room. The `FurnitureItem` / `DeskItem` types in `src/types.ts` are extensible — future furniture types (chairs, plants, etc.) only require new render branches, no DB schema changes.

**Player profile**: Players can set a custom display name and job title via `AvatarCustomizationPage` (stored in DB at `users.display_name` / `users.job_title`, fetched from `/api/player`). Display name appears above avatars and on desk nameplates; job title appears on nameplates and in the leaderboard.

**Upgrade system**:
- **Chair upgrades** (`src/chairUpgradeConstants.ts`): Up to `CHAIR_UPGRADE_MAX_LEVEL` levels; each level costs `CHAIR_UPGRADE_COST_REAMS`. Boosts seated focus energy regen during desk sessions.
- **Monitor upgrades** (`src/monitorUpgradeConstants.ts`): Up to `MONITOR_UPGRADE_MAX_LEVEL` levels; cost scales per level (`monitorUpgradeCostForNextLevel`). Boosts paper ream earn rate during focus (`focusReamsPerMinute`).
- Upgrade levels are stored per-user in DB and synced to all room members via socket on join and on purchase.

**Lifetime paper tracking** (`src/paperReamsLifetime.ts`): Computes a lower bound for total reams ever earned (balance + upgrade spend) used for the leaderboard `total_paper_reams_earned` column. Keeps totals honest for players who spent before the column existed.

**Constants** (`src/constants.ts`): `DESKS` array is kept as a legacy reference but is no longer used at runtime — desks are loaded dynamically from the DB. `COLLISION_BOXES` (`THREE.Box3` array for the entire office) and deterministic player color assignment by name hash remain in active use.

**Office layout positions** (`src/officeLayout.ts`): Canonical world-space positions for sub-room groups and interactable props (vending machine, water cooler, break room origin, etc.) — shared between client and server to avoid drift.

**Local test mode** (`server/memoryDb.ts`): When `LOCAL_TEST=1`, the server skips PostgreSQL and uses an in-memory store with mock players seeded at 1000 reams. Players are automatically evicted after a TTL with no connected socket.

**Styling**: Tailwind CSS v4 via `@tailwindcss/vite` plugin. No tailwind config file — configuration is implicit. Custom pixel-art CSS classes (`pixel-border`, `pixel-button`, `font-pixel`) are defined in `src/index.css`.
