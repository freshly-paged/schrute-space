# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (runs server.ts via tsx on port 3000)
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

## Architecture

**Single-process dev server** (`server.ts`): Express + Socket.IO server that also runs Vite as middleware. In production, serves static `dist/` files. Always runs on port 3000.

**Auth flow** (`src/hooks/useAuth.ts`): Google OAuth via popup window. On success, the popup stores a JWT in `localStorage` (`office_auth_token`) and sends a `postMessage` to the opener. The hook polls `/api/auth/me` until logged in, and authenticates the Socket.IO connection using `socket.handshake.auth.token`. Single-session enforcement: connecting with the same email disconnects the previous socket with a `forceDisconnect` event.

**Multiplayer rooms** (`src/hooks/useSocket.ts`): Server maintains `rooms: Record<roomId, Record<socketId, PlayerState>>`. Room is passed via `?room=<id>` URL query param. Players join by emitting `joinRoom`. Movement is synced via `playerMovement` events; chat via `chatMessage`. The hook owns all socket lifecycle, player state, and chat history.

**App.tsx**: Thin orchestrator — composes `useAuth` + `useSocket`, manages `currentRoom`, and renders the appropriate screen (loading → disconnected → login → room select → game).

**3D world** (`src/components/`): React Three Fiber (`@react-three/fiber`) + Drei. The `Canvas` is set up in `App.tsx`.
- `player/LocalPlayer.tsx` — Camera-relative WASD movement, desk snapping during focus. Physics delegated to `usePlayerPhysics`.
- `player/OtherPlayer.tsx` — Renders remote players from socket state.
- `player/CharacterAvatar.tsx` — Animated 3D character mesh (walk/jump/roll poses).
- `world/OfficeEnvironment.tsx` — Room orchestrator; imports `Desk`, `Chair`, `BeetFarm`, `Banner`.
- `world/Desk.tsx` — Desk + proximity detection; shows "[E] to Start Focus" prompt via `nearestDeskId` in store.
- `ui/HUDPanel.tsx` — Left overlay (stats + controls guide).
- `ui/ChatPanel.tsx` — Right overlay (chat history + input + emotes).

**Physics hook** (`src/hooks/usePlayerPhysics.ts`): Encapsulates all movement refs and logic — `processJump` (double jump), `processRoll` (double-tap W), `tickRoll`, `applyGravity`, `applyMovement` (axis-separated collision tests against `COLLISION_BOXES` and other players).

**Game state** (`src/store/useGameStore.ts`): Zustand store holding Pomodoro timer state, paper reams (passive income during focus sessions), nearest/active desk IDs, and chat focus flag. Timer integration: pressing E at a desk starts a 25-min focus timer that locks movement to the desk chair; paper accumulates at 1 ream per 30 seconds.

**Constants** (`src/constants.ts`): `DESKS` array (desk positions/rotations), `COLLISION_BOXES` (`THREE.Box3` array for the entire office), and deterministic player color assignment by name hash.

**Styling**: Tailwind CSS v4 via `@tailwindcss/vite` plugin. No tailwind config file — configuration is implicit. Custom pixel-art CSS classes (`pixel-border`, `pixel-button`, `font-pixel`) are defined in `src/index.css`.
