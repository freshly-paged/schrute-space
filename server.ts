import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import fs from "fs";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import type { ViteDevServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { nanoid } from "nanoid";
import * as mem from "./server/memoryDb.js";
import type { FurnitureItem as MemFurnitureItem } from "./server/memoryDb.js";
import {
  WORKING_AREA_BOUNDS,
  DESK_SPAWN_MARGIN,
  DESK_SPAWN_SPACING,
  WATER_COOLER_WORLD_POSITION,
  WATER_COOLER_RADIUS,
} from "./src/officeLayout.js";
import { isAllowedHeldThrowableId } from "./src/networkThrowables.js";
import {
  CHAIR_UPGRADE_COST_REAMS,
  CHAIR_UPGRADE_MAX_LEVEL,
} from "./src/chairUpgradeConstants.js";
import {
  MONITOR_UPGRADE_MAX_LEVEL,
  monitorUpgradeCostForNextLevel,
} from "./src/monitorUpgradeConstants.js";
import {
  TEAM_PYRAMID_COST_REAMS,
  TEAM_PYRAMID_DURATION_MS,
} from "./src/gameConfig.js";
import { totalPaperReamsEarnedFloor } from "./src/paperReamsLifetime.js";
import {
  FOCUS_ENERGY_MAX,
  clampFocusEnergy,
  settleFocusEnergy,
  parseFocusEnergyMode,
  type FocusEnergyMode,
} from "./src/focusEnergyModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_TEST_COOKIE = "office_local_test_identity";

function isLocalTest(): boolean {
  const v = process.env.LOCAL_TEST?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function isLocalTestEnabled(): boolean {
  return isLocalTest() && process.env.NODE_ENV !== "production";
}

function parseLocalTestCookie(
  cookieHeader: string | undefined
): { email: string; name: string } | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const p of parts) {
    if (!p.startsWith(`${LOCAL_TEST_COOKIE}=`)) continue;
    const raw = p.slice(LOCAL_TEST_COOKIE.length + 1);
    try {
      const v = decodeURIComponent(raw);
      const o = JSON.parse(v) as { email?: string; name?: string };
      if (o && typeof o.email === "string" && typeof o.name === "string") {
        return { email: o.email, name: o.name };
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

// ── Database ────────────────────────────────────────────────────────────────
// Initialised lazily: createApp(injectedPool) overrides this for tests.
let pool: pg.Pool | undefined;
if (!isLocalTest()) {
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
}

async function initDb() {
  if (isLocalTest()) return;
  await pool!.query(`
    CREATE TABLE IF NOT EXISTS users (
      email       TEXT PRIMARY KEY,
      paper_reams INTEGER NOT NULL DEFAULT 0
    )
  `);
  await pool!.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_config JSONB NOT NULL DEFAULT '{}'
  `);
  await pool!.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT
  `);
  await pool!.query(`
    CREATE TABLE IF NOT EXISTS room_layouts (
      room_id TEXT PRIMARY KEY,
      layout  JSONB NOT NULL DEFAULT '[]'
    )
  `);
  await pool!.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      room_id     TEXT PRIMARY KEY,
      max_workers INTEGER NOT NULL DEFAULT 20,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool!.query(`
    CREATE TABLE IF NOT EXISTS room_members (
      room_id   TEXT NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
      email     TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      role      TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'worker')),
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (room_id, email)
    )
  `);
  await pool!.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS chair_upgrade_level INTEGER NOT NULL DEFAULT 0
  `);
  await pool!.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS monitor_upgrade_level INTEGER NOT NULL DEFAULT 0
  `);
  await pool!.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title TEXT
  `);
  await pool!.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS total_paper_reams_earned INTEGER NOT NULL DEFAULT 0
  `);
  await pool!.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS focus_energy DOUBLE PRECISION NOT NULL DEFAULT 100
  `);
  await pool!.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS focus_energy_updated_at BIGINT
  `);
  await pool!.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS focus_energy_mode TEXT NOT NULL DEFAULT 'idle'
  `);
  await pool!.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS focus_energy_desk_owner_email TEXT
  `);
  await pool!.query(`
    UPDATE users SET focus_energy_updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
    WHERE focus_energy_updated_at IS NULL
  `);
  await backfillTotalPaperReamsEarned();
}

/**
 * Best-effort floor for lifetime earned: current balance + inferred upgrade spend.
 * Ongoing earnings update `total_paper_reams_earned` via savePaperReams deltas;
 * upgrade purchases also apply this floor so spenders are not under-ranked vs hoarders.
 */
async function backfillTotalPaperReamsEarned(): Promise<void> {
  if (isLocalTest()) return;
  const { rows } = await pool!.query<{
    email: string;
    paper_reams: number;
    cl: number;
    ml: number;
  }>(
    `SELECT email, paper_reams,
            COALESCE(chair_upgrade_level, 0) AS cl,
            COALESCE(monitor_upgrade_level, 0) AS ml
     FROM users`
  );
  for (const row of rows) {
    const atLeast = totalPaperReamsEarnedFloor(row.paper_reams, row.cl, row.ml);
    await pool!.query(
      `UPDATE users SET total_paper_reams_earned = GREATEST(total_paper_reams_earned, $1) WHERE email = $2`,
      [atLeast, row.email]
    );
  }
}

async function getPaperReams(email: string): Promise<number> {
  if (isLocalTest()) return mem.memGetPaperReams(email);
  const { rows } = await pool!.query(
    'SELECT paper_reams FROM users WHERE email = $1',
    [email]
  );
  return rows[0]?.paper_reams ?? 0;
}

async function savePaperReams(email: string, count: number): Promise<void> {
  if (isLocalTest()) return mem.memSavePaperReams(email, count);
  const c = Math.floor(count);
  await pool!.query(
    `INSERT INTO users (email, paper_reams, total_paper_reams_earned) VALUES ($1, $2, $2)
     ON CONFLICT (email) DO UPDATE SET
       paper_reams = EXCLUDED.paper_reams,
       total_paper_reams_earned = users.total_paper_reams_earned + GREATEST(0, EXCLUDED.paper_reams - users.paper_reams)`,
    [email, c]
  );
}

function normalizeFocusDeskOwnerEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (t.length === 0 || t.length > 320 || !t.includes("@")) return null;
  return t;
}

async function loadAndSettleFocusEnergy(email: string): Promise<number> {
  if (isLocalTest()) return mem.memLoadAndSettleFocusEnergy(email);
  await ensureUserRow(email);
  const { rows } = await pool!.query<{
    focus_energy: number;
    focus_energy_updated_at: string | number | null;
    focus_energy_mode: string;
    chair_upgrade_level: number;
    effective_focus_chair: number;
  }>(
    `SELECT u.focus_energy, u.focus_energy_updated_at, u.focus_energy_mode,
            COALESCE(u.chair_upgrade_level, 0) AS chair_upgrade_level,
            COALESCE(o.chair_upgrade_level, u.chair_upgrade_level) AS effective_focus_chair
     FROM users u
     LEFT JOIN users o ON o.email = u.focus_energy_desk_owner_email
     WHERE u.email = $1`,
    [email]
  );
  const r = rows[0];
  const now = Date.now();
  const fromMs =
    r?.focus_energy_updated_at != null ? Number(r.focus_energy_updated_at) : now;
  const rawStored = Number(r?.focus_energy);
  const stored = Number.isFinite(rawStored) ? rawStored : FOCUS_ENERGY_MAX;
  const mode = parseFocusEnergyMode(r?.focus_energy_mode);
  const chairLv =
    mode === "focus"
      ? Number(r?.effective_focus_chair ?? r?.chair_upgrade_level ?? 0)
      : Number(r?.chair_upgrade_level ?? 0);
  const settled = settleFocusEnergy(stored, fromMs, now, mode, chairLv);
  await pool!.query(
    `UPDATE users SET focus_energy = $1, focus_energy_updated_at = $2, focus_energy_mode = $3 WHERE email = $4`,
    [settled, now, mode, email]
  );
  return settled;
}

async function saveFocusEnergy(
  email: string,
  energy: number,
  mode: FocusEnergyMode,
  focusDeskOwnerEmail: string | null = null
): Promise<void> {
  if (isLocalTest()) return mem.memSaveFocusEnergy(email, energy, mode, focusDeskOwnerEmail);
  await ensureUserRow(email);
  const now = Date.now();
  const e = clampFocusEnergy(energy);
  const m: FocusEnergyMode = mode === "focus" ? "focus" : "idle";
  const deskRef = m === "focus" ? focusDeskOwnerEmail : null;
  await pool!.query(
    `UPDATE users SET focus_energy = $1, focus_energy_updated_at = $2, focus_energy_mode = $3,
            focus_energy_desk_owner_email = $5
     WHERE email = $4`,
    [e, now, m, email, deskRef]
  );
}

async function settleFocusEnergyOnDisconnect(email: string): Promise<void> {
  if (isLocalTest()) return mem.memSettleFocusEnergyOnDisconnect(email);
  const { rows } = await pool!.query<{
    focus_energy: number;
    focus_energy_updated_at: string | number | null;
    focus_energy_mode: string;
    chair_upgrade_level: number;
    effective_focus_chair: number;
  }>(
    `SELECT u.focus_energy, u.focus_energy_updated_at, u.focus_energy_mode,
            COALESCE(u.chair_upgrade_level, 0) AS chair_upgrade_level,
            COALESCE(o.chair_upgrade_level, u.chair_upgrade_level) AS effective_focus_chair
     FROM users u
     LEFT JOIN users o ON o.email = u.focus_energy_desk_owner_email
     WHERE u.email = $1`,
    [email]
  );
  if (!rows[0]) return;
  const r = rows[0];
  const now = Date.now();
  const fromMs =
    r.focus_energy_updated_at != null ? Number(r.focus_energy_updated_at) : now;
  const rawStored = Number(r.focus_energy);
  const stored = Number.isFinite(rawStored) ? rawStored : FOCUS_ENERGY_MAX;
  const mode = parseFocusEnergyMode(r.focus_energy_mode);
  const chairLv =
    mode === "focus"
      ? Number(r.effective_focus_chair ?? r.chair_upgrade_level ?? 0)
      : Number(r.chair_upgrade_level ?? 0);
  const settled = settleFocusEnergy(stored, fromMs, now, mode, chairLv);
  await pool!.query(
    `UPDATE users SET focus_energy = $1, focus_energy_updated_at = $2, focus_energy_mode = 'idle',
            focus_energy_desk_owner_email = NULL
     WHERE email = $3`,
    [settled, now, email]
  );
}

interface AvatarConfig {
  shirtColor: string;
  skinTone: string;
  pantColor: string;
}

async function getAvatarConfig(email: string): Promise<AvatarConfig | null> {
  if (isLocalTest()) return mem.memGetAvatarConfig(email);
  const { rows } = await pool!.query(
    'SELECT avatar_config FROM users WHERE email = $1',
    [email]
  );
  const config = rows[0]?.avatar_config;
  if (!config || Object.keys(config).length === 0) return null;
  return config as AvatarConfig;
}


async function saveAvatarConfig(email: string, config: AvatarConfig): Promise<void> {
  if (isLocalTest()) return mem.memSaveAvatarConfig(email, config);
  await pool!.query(
    `INSERT INTO users (email, avatar_config) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET avatar_config = EXCLUDED.avatar_config`,
    [email, JSON.stringify(config)]
  );
}

// ── Room Layout ───────────────────────────────────────────────────────────────

type FurnitureItem = MemFurnitureItem;

interface DeskItem extends FurnitureItem {
  type: 'desk';
  config: { ownerEmail: string; ownerName: string; [key: string]: unknown };
}

function extractDeskOwnerEmails(layout: FurnitureItem[]): string[] {
  const seen = new Set<string>();
  for (const f of layout) {
    if (f.type !== "desk") continue;
    const email = (f as DeskItem).config?.ownerEmail;
    if (typeof email === "string" && email.length > 0) seen.add(email);
  }
  return [...seen];
}

async function getChairAndMonitorLevelsForEmails(
  emails: string[]
): Promise<{ chairs: Record<string, number>; monitors: Record<string, number> }> {
  if (emails.length === 0) return { chairs: {}, monitors: {} };
  if (isLocalTest()) {
    const [chairs, monitors] = await Promise.all([
      mem.memGetChairLevelsForEmails(emails),
      mem.memGetMonitorLevelsForEmails(emails),
    ]);
    return { chairs, monitors };
  }
  const { rows } = await pool!.query(
    "SELECT email, COALESCE(chair_upgrade_level, 0) AS chair_upgrade_level, COALESCE(monitor_upgrade_level, 0) AS monitor_upgrade_level FROM users WHERE email = ANY($1::text[])",
    [emails]
  );
  const chairs: Record<string, number> = {};
  const monitors: Record<string, number> = {};
  for (const e of emails) {
    chairs[e] = 0;
    monitors[e] = 0;
  }
  for (const row of rows) {
    const cn = Number(row.chair_upgrade_level);
    chairs[row.email] = Math.min(
      CHAIR_UPGRADE_MAX_LEVEL,
      Math.max(0, Number.isFinite(cn) ? Math.floor(cn) : 0)
    );
    const mn = Number(row.monitor_upgrade_level);
    monitors[row.email] = Math.min(
      MONITOR_UPGRADE_MAX_LEVEL,
      Math.max(0, Number.isFinite(mn) ? Math.floor(mn) : 0)
    );
  }
  return { chairs, monitors };
}

type ChairPurchaseResult =
  | { ok: true; paperReams: number; chairUpgradeLevel: number }
  | { ok: false; error: "max_level" | "insufficient" };

async function purchaseChairUpgradeTxn(email: string): Promise<ChairPurchaseResult> {
  if (isLocalTest()) {
    return mem.memPurchaseChairUpgrade(email, CHAIR_UPGRADE_COST_REAMS);
  }
  const client = await pool!.connect();
  try {
    await client.query("BEGIN");
    const sel = await client.query(
      `SELECT paper_reams,
              COALESCE(chair_upgrade_level, 0) AS chair_upgrade_level,
              COALESCE(monitor_upgrade_level, 0) AS monitor_upgrade_level
       FROM users WHERE email = $1 FOR UPDATE`,
      [email]
    );
    if (sel.rows.length === 0) {
      await client.query("ROLLBACK");
      return { ok: false, error: "insufficient" };
    }
    const paper = sel.rows[0].paper_reams as number;
    let level = Math.floor(Number(sel.rows[0].chair_upgrade_level));
    if (!Number.isFinite(level)) level = 0;
    level = Math.min(CHAIR_UPGRADE_MAX_LEVEL, Math.max(0, level));
    if (level >= CHAIR_UPGRADE_MAX_LEVEL) {
      await client.query("ROLLBACK");
      return { ok: false, error: "max_level" };
    }
    if (paper < CHAIR_UPGRADE_COST_REAMS) {
      await client.query("ROLLBACK");
      return { ok: false, error: "insufficient" };
    }
    const newPaper = paper - CHAIR_UPGRADE_COST_REAMS;
    const newLevel = level + 1;
    const monitorLv = Number(sel.rows[0].monitor_upgrade_level);
    const floor = totalPaperReamsEarnedFloor(newPaper, newLevel, monitorLv);
    await client.query(
      `UPDATE users SET paper_reams = $1, chair_upgrade_level = $2,
         total_paper_reams_earned = GREATEST(total_paper_reams_earned, $4)
       WHERE email = $3`,
      [newPaper, newLevel, email, floor]
    );
    await client.query("COMMIT");
    return { ok: true, paperReams: newPaper, chairUpgradeLevel: newLevel };
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    client.release();
  }
}

type MonitorPurchaseResult =
  | { ok: true; paperReams: number; monitorUpgradeLevel: number }
  | { ok: false; error: "max_level" | "insufficient" };

async function purchaseMonitorUpgradeTxn(email: string): Promise<MonitorPurchaseResult> {
  if (isLocalTest()) {
    return mem.memPurchaseMonitorUpgrade(email);
  }
  const client = await pool!.connect();
  try {
    await client.query("BEGIN");
    const sel = await client.query(
      `SELECT paper_reams,
              COALESCE(chair_upgrade_level, 0) AS chair_upgrade_level,
              COALESCE(monitor_upgrade_level, 0) AS monitor_upgrade_level
       FROM users WHERE email = $1 FOR UPDATE`,
      [email]
    );
    if (sel.rows.length === 0) {
      await client.query("ROLLBACK");
      return { ok: false, error: "insufficient" };
    }
    const paper = sel.rows[0].paper_reams as number;
    let level = Math.floor(Number(sel.rows[0].monitor_upgrade_level));
    if (!Number.isFinite(level)) level = 0;
    level = Math.min(MONITOR_UPGRADE_MAX_LEVEL, Math.max(0, level));
    if (level >= MONITOR_UPGRADE_MAX_LEVEL) {
      await client.query("ROLLBACK");
      return { ok: false, error: "max_level" };
    }
    const cost = monitorUpgradeCostForNextLevel(level);
    if (paper < cost) {
      await client.query("ROLLBACK");
      return { ok: false, error: "insufficient" };
    }
    const newPaper = paper - cost;
    const newLevel = level + 1;
    const chairLv = Number(sel.rows[0].chair_upgrade_level);
    const floor = totalPaperReamsEarnedFloor(newPaper, chairLv, newLevel);
    await client.query(
      `UPDATE users SET paper_reams = $1, monitor_upgrade_level = $2,
         total_paper_reams_earned = GREATEST(total_paper_reams_earned, $4)
       WHERE email = $3`,
      [newPaper, newLevel, email, floor]
    );
    await client.query("COMMIT");
    return { ok: true, paperReams: newPaper, monitorUpgradeLevel: newLevel };
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    client.release();
  }
}

type TeamPyramidPurchaseResult =
  | { ok: true; paperReams: number }
  | { ok: false; error: "insufficient" };

async function purchaseTeamPyramidTxn(email: string): Promise<TeamPyramidPurchaseResult> {
  if (isLocalTest()) {
    return mem.memPurchaseTeamPyramid(email);
  }
  const client = await pool!.connect();
  try {
    await client.query("BEGIN");
    const sel = await client.query(
      `SELECT paper_reams,
              COALESCE(chair_upgrade_level, 0) AS chair_upgrade_level,
              COALESCE(monitor_upgrade_level, 0) AS monitor_upgrade_level
       FROM users WHERE email = $1 FOR UPDATE`,
      [email]
    );
    if (sel.rows.length === 0) {
      await client.query("ROLLBACK");
      return { ok: false, error: "insufficient" };
    }
    const paper = sel.rows[0].paper_reams as number;
    if (paper < TEAM_PYRAMID_COST_REAMS) {
      await client.query("ROLLBACK");
      return { ok: false, error: "insufficient" };
    }
    const newPaper = paper - TEAM_PYRAMID_COST_REAMS;
    const chairLv = Number(sel.rows[0].chair_upgrade_level);
    const monitorLv = Number(sel.rows[0].monitor_upgrade_level);
    const floor = totalPaperReamsEarnedFloor(newPaper, chairLv, monitorLv);
    await client.query(
      `UPDATE users SET paper_reams = $1,
         total_paper_reams_earned = GREATEST(total_paper_reams_earned, $3)
       WHERE email = $2`,
      [newPaper, email, floor]
    );
    await client.query("COMMIT");
    return { ok: true, paperReams: newPaper };
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    client.release();
  }
}

async function broadcastDeskChairLevels(io: Server, roomId: string, layout: FurnitureItem[]) {
  const emails = extractDeskOwnerEmails(layout);
  const { chairs, monitors } = await getChairAndMonitorLevelsForEmails(emails);
  io.to(roomId).emit("deskChairLevels", chairs);
  io.to(roomId).emit("deskMonitorLevels", monitors);
}

async function getRoomLayout(roomId: string): Promise<FurnitureItem[]> {
  if (isLocalTest()) return mem.memGetRoomLayout(roomId);
  const { rows } = await pool!.query(
    'SELECT layout FROM room_layouts WHERE room_id = $1',
    [roomId]
  );
  return (rows[0]?.layout as FurnitureItem[]) ?? [];
}

async function saveRoomLayout(roomId: string, layout: FurnitureItem[]): Promise<void> {
  if (isLocalTest()) return mem.memSaveRoomLayout(roomId, layout);
  await pool!.query(
    `INSERT INTO room_layouts (room_id, layout) VALUES ($1, $2)
     ON CONFLICT (room_id) DO UPDATE SET layout = EXCLUDED.layout`,
    [roomId, JSON.stringify(layout)]
  );
}

/** Serialize layout read–modify–write per room so concurrent joins/API never interleave. */
const roomLayoutMutationChains = new Map<string, Promise<unknown>>();

function runSerializedRoomLayout<T>(roomId: string, fn: () => Promise<T>): Promise<T> {
  const prev = roomLayoutMutationChains.get(roomId) ?? Promise.resolve();
  const run = prev.catch(() => {}).then(() => fn());
  roomLayoutMutationChains.set(
    roomId,
    run.then(
      () => {},
      () => {}
    )
  );
  return run;
}

function generateSpawnPosition(existingDesks: DeskItem[]): [number, number, number] {
  const { x1, z1, x2, z2 } = WORKING_AREA_BOUNDS;
  const xMin = x1 + DESK_SPAWN_MARGIN;
  const xMax = x2 - DESK_SPAWN_MARGIN;
  const zMin = z1 + DESK_SPAWN_MARGIN;
  const zMax = z2 - DESK_SPAWN_MARGIN;

  const columns: number[] = [];
  for (let x = xMin; x <= xMax; x += DESK_SPAWN_SPACING) columns.push(x);
  const rows: number[] = [];
  for (let z = zMin; z <= zMax; z += DESK_SPAWN_SPACING) rows.push(z);

  for (const z of rows) {
    for (const x of columns) {
      const occupied = existingDesks.some((d) => {
        const dx = d.position[0] - x;
        const dz = d.position[2] - z;
        return Math.sqrt(dx * dx + dz * dz) < DESK_SPAWN_SPACING;
      });
      if (!occupied) return [x, 0, z];
    }
  }
  // Fallback: random within inner bounds
  return [xMin + Math.random() * (xMax - xMin), 0, zMin + Math.random() * (zMax - zMin)];
}

function layoutHasDeskForEmail(layout: FurnitureItem[], email: string): boolean {
  return layout.some((f) => {
    if (f.type !== "desk") return false;
    const ownerEmail = (f as DeskItem).config?.ownerEmail;
    return typeof ownerEmail === "string" && ownerEmail === email;
  });
}

/**
 * Ensures a desk exists for this member (must run inside runSerializedRoomLayout for roomId).
 */
async function ensurePlayerDeskBody(
  roomId: string,
  email: string,
  name: string
): Promise<FurnitureItem[]> {
  const layout = await getRoomLayout(roomId);
  if (layoutHasDeskForEmail(layout, email)) {
    return layout;
  }

  const desks = layout.filter((f): f is DeskItem => f.type === 'desk');
  const position = generateSpawnPosition(desks);
  const newDesk: DeskItem = {
    id: `desk-${email}`,
    type: 'desk',
    position,
    rotation: [0, 0, 0],
    config: { ownerEmail: email, ownerName: name },
  };
  const updated = [...layout, newDesk];
  await saveRoomLayout(roomId, updated);
  return updated;
}

/**
 * Ensures a desk exists for this member. Serialized per roomId so concurrent async
 * joinRoom handlers cannot overwrite each other (late roomLayoutUpdated would drop desks).
 */
function ensurePlayerDesk(roomId: string, email: string, name: string): Promise<FurnitureItem[]> {
  return runSerializedRoomLayout(roomId, () => ensurePlayerDeskBody(roomId, email, name));
}

// ── Room Management ───────────────────────────────────────────────────────────

type RoomRole = 'admin' | 'manager' | 'worker';

async function ensureRoom(roomId: string): Promise<boolean> {
  if (isLocalTest()) return mem.memEnsureRoom(roomId);
  const result = await pool!.query(
    `INSERT INTO rooms (room_id) VALUES ($1) ON CONFLICT (room_id) DO NOTHING RETURNING room_id`,
    [roomId]
  );
  return (result.rowCount ?? 0) > 0;
}

async function getMemberRole(roomId: string, email: string): Promise<RoomRole | null> {
  if (isLocalTest()) return mem.memGetMemberRole(roomId, email);
  const { rows } = await pool!.query(
    'SELECT role FROM room_members WHERE room_id = $1 AND email = $2',
    [roomId, email]
  );
  return (rows[0]?.role as RoomRole) ?? null;
}

async function upsertMember(roomId: string, email: string, role: RoomRole): Promise<void> {
  if (isLocalTest()) return mem.memUpsertMember(roomId, email, role);
  await pool!.query(
    `INSERT INTO room_members (room_id, email, role) VALUES ($1, $2, $3)
     ON CONFLICT (room_id, email) DO UPDATE SET role = EXCLUDED.role`,
    [roomId, email, role]
  );
}

async function removeMember(roomId: string, email: string): Promise<void> {
  if (isLocalTest()) return mem.memRemoveMember(roomId, email);
  await pool!.query(
    'DELETE FROM room_members WHERE room_id = $1 AND email = $2',
    [roomId, email]
  );
}

async function getRoomMembers(
  roomId: string
): Promise<
  Array<{ email: string; name: string | null; jobTitle: string | null; role: string; joinedAt: Date }>
> {
  if (isLocalTest()) return mem.memGetRoomMembers(roomId);
  const { rows } = await pool!.query(
    `SELECT rm.email, u.display_name as name, u.job_title as "jobTitle", rm.role, rm.joined_at as "joinedAt"
     FROM room_members rm
     LEFT JOIN users u ON u.email = rm.email
     WHERE rm.room_id = $1
     ORDER BY rm.joined_at ASC`,
    [roomId]
  );
  return rows;
}

async function getRoomLeaderboard(
  roomId: string
): Promise<
  Array<{
    email: string;
    name: string | null;
    jobTitle: string | null;
    role: string;
    totalReamsEarned: number;
  }>
> {
  if (isLocalTest()) return mem.memGetRoomLeaderboard(roomId);
  const { rows } = await pool!.query(
    `SELECT rm.email, u.display_name as name, u.job_title as "jobTitle", rm.role,
            COALESCE(u.total_paper_reams_earned, u.paper_reams, 0) as "totalReamsEarned"
     FROM room_members rm
     LEFT JOIN users u ON u.email = rm.email
     WHERE rm.room_id = $1
     ORDER BY COALESCE(u.total_paper_reams_earned, u.paper_reams, 0) DESC NULLS LAST`,
    [roomId]
  );
  return rows;
}

async function getMyRooms(email: string): Promise<Array<{ roomId: string; role: string; maxWorkers: number }>> {
  if (isLocalTest()) return mem.memGetMyRooms(email);
  const { rows } = await pool!.query(
    `SELECT rm.room_id as "roomId", rm.role, r.max_workers as "maxWorkers"
     FROM room_members rm
     JOIN rooms r ON r.room_id = rm.room_id
     WHERE rm.email = $1
     ORDER BY rm.joined_at ASC`,
    [email]
  );
  return rows;
}

async function getRoomMaxWorkers(roomId: string): Promise<number> {
  if (isLocalTest()) return mem.memGetRoomMaxWorkers(roomId);
  const { rows } = await pool!.query(
    "SELECT max_workers FROM rooms WHERE room_id = $1",
    [roomId]
  );
  return rows[0]?.max_workers ?? 20;
}

async function getRoomMemberCount(roomId: string): Promise<number> {
  if (isLocalTest()) return mem.memGetRoomMemberCount(roomId);
  const { rows } = await pool!.query(
    "SELECT COUNT(*) FROM room_members WHERE room_id = $1",
    [roomId]
  );
  return parseInt(rows[0].count, 10);
}

async function ensureUserRow(email: string): Promise<void> {
  if (isLocalTest()) return mem.memEnsureUser(email);
  await pool!.query(
    `INSERT INTO users (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`,
    [email]
  );
}

/** Seeds display_name from IAP/auth when missing; never overwrites a player-chosen name. */
async function seedUserDisplayNameFromAuth(email: string, fallbackDisplayName: string): Promise<void> {
  if (isLocalTest()) return mem.memSeedUserDisplayNameIfEmpty(email, fallbackDisplayName);
  await pool!.query(
    `INSERT INTO users (email, display_name) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET
       display_name = COALESCE(users.display_name, EXCLUDED.display_name)`,
    [email, fallbackDisplayName]
  );
}

async function getUserProfileFields(
  email: string
): Promise<{ display_name: string | null; job_title: string | null }> {
  if (isLocalTest()) return mem.memGetUserProfileFields(email);
  const { rows } = await pool!.query(
    `SELECT display_name, job_title FROM users WHERE email = $1`,
    [email]
  );
  const r = rows[0];
  return {
    display_name: r?.display_name ?? null,
    job_title: r?.job_title ?? null,
  };
}

const MAX_PROFILE_DISPLAY_NAME = 40;
const MAX_PROFILE_JOB_TITLE = 60;

function sanitizeProfileLine(value: unknown, maxLen: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;
  const t = value.trim().replace(/[\x00-\x1f\x7f]/g, "");
  if (!t) return null;
  return t.slice(0, maxLen);
}

async function saveUserProfileDisplayAndTitle(
  email: string,
  displayName: string,
  jobTitle: string | null
): Promise<void> {
  if (isLocalTest()) return mem.memSaveUserProfileFields(email, displayName, jobTitle);
  await pool!.query(
    `INSERT INTO users (email, display_name, job_title) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name, job_title = EXCLUDED.job_title`,
    [email, displayName, jobTitle]
  );
}

async function updateRoomMaxWorkers(roomId: string, maxWorkers: number): Promise<void> {
  if (isLocalTest()) return mem.memUpdateRoomMaxWorkers(roomId, maxWorkers);
  await pool!.query("UPDATE rooms SET max_workers = $1 WHERE room_id = $2", [
    maxWorkers,
    roomId,
  ]);
}

// ── Config ───────────────────────────────────────────────────────────────────

// Extract user from IAP-injected headers (X-Goog-Authenticated-User-Email).
// Falls back to DEV_USER_EMAIL for local development without IAP.
// When LOCAL_TEST is enabled (non-production), uses HttpOnly cookie identity or returns null until /api/auth/me mints one.
function getIAPUser(headers: Record<string, any>): { email: string; name: string } | null {
  const iapEmail = headers['x-goog-authenticated-user-email'];
  if (iapEmail && typeof iapEmail === 'string') {
    const email = iapEmail.includes(':') ? iapEmail.split(':')[1] : iapEmail;
    const name = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    return { email, name };
  }
  const devEmail = process.env.DEV_USER_EMAIL;
  if (devEmail) {
    const name = devEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    return { email: devEmail, name };
  }
  if (isLocalTestEnabled()) {
    const fromCookie = parseLocalTestCookie(headers.cookie);
    if (fromCookie) return fromCookie;
    return null;
  }
  // Local `npm run dev`: no IAP headers — act as a default dev user (production uses NODE_ENV=production).
  if (process.env.NODE_ENV !== "production") {
    return { email: "dev@local.test", name: "Local Dev" };
  }
  return null;
}

// Exported so tests can inject a mock pg.Pool and skip port binding.
// Does NOT call httpServer.listen() — callers are responsible for that.
export async function createApp(injectedPool?: pg.Pool) {
  // Override the module-level pool when a test-supplied pool is injected.
  if (injectedPool !== undefined) pool = injectedPool;

  await initDb();
  if (isLocalTest()) {
    console.log(
      "[LOCAL_TEST] in-memory DB; auto mock users; TTL exit when NODE_ENV is not production"
    );
  }
  const app = express();
  app.set("trust proxy", 1);
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      credentials: true,
    },
  });

  // Attach IAP-authenticated user to every request
  app.use((req: any, _res: any, next: any) => {
    req.user = getIAPUser(req.headers);
    next();
  });

  // Track active users by email to prevent multiple sessions
  const activeUsers = new Map<string, string>(); // email -> socketId

  // Auth Routes
  app.get("/api/auth/me", (req, res) => {
    if (isLocalTestEnabled()) {
      let user = getIAPUser(req.headers);
      if (!user) {
        const id = nanoid(8);
        user = { email: `mock-${id}@local.test`, name: `Player ${id}` };
        const payload = encodeURIComponent(JSON.stringify(user));
        res.setHeader(
          "Set-Cookie",
          `${LOCAL_TEST_COOKIE}=${payload}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`
        );
      }
      return res.json(user);
    }
    res.json((req as any).user || null);
  });

  app.get("/api/player", async (req, res) => {
    const user = (req as any).user;
    if (!user?.email) return res.status(401).json({ error: "Unauthorized" });
    const [paperReams, avatarConfig, profile, focusEnergy] = await Promise.all([
      getPaperReams(user.email),
      getAvatarConfig(user.email),
      getUserProfileFields(user.email),
      loadAndSettleFocusEnergy(user.email),
    ]);
    res.json({
      paperReams,
      avatarConfig,
      displayName: profile.display_name,
      jobTitle: profile.job_title,
      focusEnergy,
    });
  });

  app.post("/api/player/focus-energy", express.json(), async (req, res) => {
    const user = (req as any).user;
    if (!user?.email) return res.status(401).json({ error: "Unauthorized" });
    const body = req.body ?? {};
    const e = body.energy;
    const m = body.mode;
    if (typeof e !== "number" || !Number.isFinite(e)) {
      return res.status(400).json({ error: "Invalid energy" });
    }
    const mode: FocusEnergyMode = m === "focus" ? "focus" : "idle";
    const deskOwner =
      mode === "focus" ? normalizeFocusDeskOwnerEmail(body.deskOwnerEmail) : null;
    await saveFocusEnergy(user.email, e, mode, deskOwner);
    res.json({ ok: true });
  });

  app.post("/api/avatar", express.json(), async (req, res) => {
    const user = (req as any).user;
    if (!user?.email) return res.status(401).json({ error: "Unauthorized" });
    const body = req.body ?? {};
    const { shirtColor, skinTone, pantColor, displayName: rawDisplayName, jobTitle: rawJobTitle } = body;
    if (typeof shirtColor !== "string" || typeof skinTone !== "string" || typeof pantColor !== "string") {
      return res.status(400).json({ error: "Invalid avatar config" });
    }
    await saveAvatarConfig(user.email, { shirtColor, skinTone, pantColor });

    const hasJobTitleKey = Object.prototype.hasOwnProperty.call(body, "jobTitle");
    if (rawDisplayName !== undefined || hasJobTitleKey) {
      const cur = await getUserProfileFields(user.email);
      let nextName: string;
      if (rawDisplayName !== undefined) {
        const s = sanitizeProfileLine(rawDisplayName, MAX_PROFILE_DISPLAY_NAME);
        if (!s) return res.status(400).json({ error: "Invalid display name" });
        nextName = s;
      } else {
        const fallback = (cur.display_name?.trim() || user.name).slice(0, MAX_PROFILE_DISPLAY_NAME);
        nextName = fallback || user.email.split("@")[0];
      }
      let nextTitle = cur.job_title;
      if (hasJobTitleKey) {
        nextTitle =
          rawJobTitle === null || rawJobTitle === ""
            ? null
            : sanitizeProfileLine(rawJobTitle, MAX_PROFILE_JOB_TITLE);
      }
      await saveUserProfileDisplayAndTitle(user.email, nextName, nextTitle);
    }

    res.json({ ok: true });
  });

  app.post("/api/room-layout", express.json(), async (req, res) => {
    const user = (req as any).user;
    if (!user?.email) return res.status(401).json({ error: "Unauthorized" });
    const { roomId, layout } = req.body ?? {};
    if (typeof roomId !== 'string' || !Array.isArray(layout)) {
      return res.status(400).json({ error: "Invalid layout" });
    }
    await runSerializedRoomLayout(roomId, async () => {
      await saveRoomLayout(roomId, layout as FurnitureItem[]);
    });
    io.to(roomId).emit("roomLayoutUpdated", layout);
    void broadcastDeskChairLevels(io, roomId, layout as FurnitureItem[]);
    res.json({ ok: true });
  });

  app.get("/api/my-rooms", async (req, res) => {
    const user = (req as any).user;
    if (!user?.email) return res.status(401).json({ error: "Unauthorized" });
    try {
      const myRooms = await getMyRooms(user.email);
      const withOnline = myRooms.map(r => ({
        ...r,
        onlineCount: Object.keys(rooms[r.roomId] ?? {}).length
      }));
      res.json(withOnline);
    } catch {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/room/:roomId/leaderboard", async (req, res) => {
    const user = (req as any).user;
    if (!user?.email) return res.status(401).json({ error: "Unauthorized" });
    try {
      const leaderboard = await getRoomLeaderboard(req.params.roomId);
      res.json(leaderboard);
    } catch {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/room/:roomId/members", async (req, res) => {
    const user = (req as any).user;
    if (!user?.email) return res.status(401).json({ error: "Unauthorized" });
    const { roomId } = req.params;
    try {
      const members = await getRoomMembers(roomId);
      const onlineEmails = new Set(
        Object.values(rooms[roomId] ?? {}).map((p: any) => p.email)
      );
      const onlineVisitors = Object.values(rooms[roomId] ?? {})
        .filter((p: any) => !members.some(m => m.email === p.email))
        .map((p: any) => ({ email: p.email, name: p.name, role: null, isOnline: true }));
      res.json({
        members: members.map(m => ({ ...m, isOnline: onlineEmails.has(m.email) })),
        visitors: onlineVisitors
      });
    } catch {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/room/:roomId/members", express.json(), async (req, res) => {
    const user = (req as any).user;
    if (!user?.email) return res.status(401).json({ error: "Unauthorized" });
    const { roomId } = req.params;
    const { email, role = 'worker' } = req.body ?? {};
    if (!email || typeof email !== 'string' || !['worker', 'manager'].includes(role)) {
      return res.status(400).json({ error: "Invalid request" });
    }
    try {
      const requesterRole = await getMemberRole(roomId, user.email);
      if (!requesterRole || requesterRole === 'worker') {
        return res.status(403).json({ error: "Forbidden" });
      }
      if (role === 'manager' && requesterRole !== 'admin') {
        return res.status(403).json({ error: "Only admins can assign managers" });
      }
      const [currentCount, maxWorkers] = await Promise.all([
        getRoomMemberCount(roomId),
        getRoomMaxWorkers(roomId),
      ]);
      if (currentCount >= maxWorkers) {
        return res.status(409).json({ error: "Room is at capacity" });
      }
      // Ensure user row exists before adding to room_members
      await ensureUserRow(email);
      await upsertMember(roomId, email, role as RoomRole);
      // If the new member is currently online, give them a desk and notify them
      const onlineEntry = Object.entries(rooms[roomId] ?? {})
        .find(([, p]: [string, any]) => p.email === email);
      if (onlineEntry) {
        const layout = await ensurePlayerDesk(roomId, email, (onlineEntry[1] as any).name);
        io.to(roomId).emit("roomLayoutUpdated", layout);
        void broadcastDeskChairLevels(io, roomId, layout);
        io.to(onlineEntry[0]).emit("roleChanged", { newRole: role });
      }
      const members = await getRoomMembers(roomId);
      const onlineEmails = new Set(Object.values(rooms[roomId] ?? {}).map((p: any) => p.email));
      io.to(roomId).emit("roomMembersUpdated", {
        roomId,
        members: members.map(m => ({ ...m, isOnline: onlineEmails.has(m.email) }))
      });
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/room/:roomId/members/:memberEmail", async (req, res) => {
    const user = (req as any).user;
    if (!user?.email) return res.status(401).json({ error: "Unauthorized" });
    const { roomId, memberEmail } = req.params;
    try {
      const requesterRole = await getMemberRole(roomId, user.email);
      if (!requesterRole || requesterRole === 'worker') {
        return res.status(403).json({ error: "Forbidden" });
      }
      const targetRole = await getMemberRole(roomId, memberEmail);
      if (targetRole === 'admin') {
        return res.status(403).json({ error: "Cannot remove admin" });
      }
      if (!targetRole) {
        return res.status(404).json({ error: "Member not found" });
      }
      // Remove their desk from layout
      let removedDeskLayout: FurnitureItem[] | null = null;
      await runSerializedRoomLayout(roomId, async () => {
        const layout = await getRoomLayout(roomId);
        const filtered = layout.filter((f) => {
          if (f.type !== 'desk') return true;
          const owner = (f as DeskItem).config?.ownerEmail;
          return !(typeof owner === 'string' && owner === memberEmail);
        });
        if (filtered.length !== layout.length) {
          await saveRoomLayout(roomId, filtered);
          removedDeskLayout = filtered;
        }
      });
      if (removedDeskLayout) {
        io.to(roomId).emit("roomLayoutUpdated", removedDeskLayout);
        void broadcastDeskChairLevels(io, roomId, removedDeskLayout);
      }
      await removeMember(roomId, memberEmail);
      // Notify the removed member's socket if online
      const removedEntry = Object.entries(rooms[roomId] ?? {})
        .find(([, p]: [string, any]) => p.email === memberEmail);
      if (removedEntry) {
        io.to(removedEntry[0]).emit("roleChanged", { newRole: null });
      }
      const members = await getRoomMembers(roomId);
      const onlineEmails = new Set(Object.values(rooms[roomId] ?? {}).map((p: any) => p.email));
      io.to(roomId).emit("roomMembersUpdated", {
        roomId,
        members: members.map(m => ({ ...m, isOnline: onlineEmails.has(m.email) }))
      });
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/room/:roomId", express.json(), async (req, res) => {
    const user = (req as any).user;
    if (!user?.email) return res.status(401).json({ error: "Unauthorized" });
    const { roomId } = req.params;
    const { maxWorkers } = req.body ?? {};
    try {
      const requesterRole = await getMemberRole(roomId, user.email);
      if (requesterRole !== 'admin') {
        return res.status(403).json({ error: "Forbidden" });
      }
      if (typeof maxWorkers !== 'number' || maxWorkers < 1 || maxWorkers > 100) {
        return res.status(400).json({ error: "maxWorkers must be 1-100" });
      }
      await updateRoomMaxWorkers(roomId, maxWorkers);
      io.to(roomId).emit("roomMembersUpdated", { roomId, maxWorkers });
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (_req, res) => {
    res.json({ success: true });
  });

  // Player state grouped by room
const rooms: Record<string, Record<string, any>> = {};

/** Per-room Team Pyramid buff expiry (epoch ms). In-memory only. */
const roomTeamPyramidBuffExpiresAt: Record<string, number> = {};
const TEAM_PYRAMID_SYSTEM_CHAT_TEXT = "Unleash the power of Pyramid!";
const IDENTITY_THEFT_VIDEO_URL = "https://www.youtube.com/watch?v=WaaANll8h18";
const IDENTITY_THEFT_SYSTEM_CHAT_TEXT = `Identity theft is not a joke! ${IDENTITY_THEFT_VIDEO_URL}`;

function activeTeamPyramidBuffExpiresAt(roomId: string): number | null {
  const raw = roomTeamPyramidBuffExpiresAt[roomId];
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  if (Date.now() >= raw) return null;
  return raw;
}

function systemChatMessage(text: string) {
  return {
    id: `system-${nanoid(10)}`,
    playerId: "system",
    playerName: "System",
    text,
    time: Date.now(),
  };
}

function deskOwnerEmailByDeskId(layout: FurnitureItem[], deskId: string | null): string | null {
  if (!deskId) return null;
  const desk = layout.find((f): f is DeskItem => f.type === "desk" && f.id === deskId);
  const ownerEmail = desk?.config?.ownerEmail;
  if (typeof ownerEmail !== "string" || ownerEmail.length === 0) return null;
  return ownerEmail;
}

const OFFICE_COLORS = [
  "#4f46e5", // Indigo
  "#059669", // Emerald
  "#d97706", // Amber
  "#dc2626", // Red
  "#7c3aed", // Violet
  "#2563eb", // Blue
  "#db2777", // Pink
  "#0891b2", // Cyan
];

const getDeterministicColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return OFFICE_COLORS[Math.abs(hash) % OFFICE_COLORS.length];
};

io.on("connection", (socket) => {
    console.log("New socket connection attempt:", socket.id);
    const user = getIAPUser((socket.request as any).headers);

    if (!user) {
      console.log("Unauthorized connection attempt");
      socket.disconnect();
      return;
    }

    console.log("User connected:", socket.id, user.email);

    // Single session enforcement
    const existingSocketId = activeUsers.get(user.email);
    if (existingSocketId) {
      console.log(`Disconnecting existing session for ${user.email}`);
      io.to(existingSocketId).emit("forceDisconnect", "Logged in from another tab");
      const existingSocket = io.sockets.sockets.get(existingSocketId);
      if (existingSocket) existingSocket.disconnect();
    }
    activeUsers.set(user.email, socket.id);

    socket.on("joinRoom", async (data: { roomId: string; focusEnergy?: number }) => {
      const { roomId } = data;
      const clientFocusEnergy =
        typeof data.focusEnergy === 'number' && Number.isFinite(data.focusEnergy)
          ? clampFocusEnergy(data.focusEnergy)
          : null;
      const room = roomId || "default";
      socket.join(room);

      if (!rooms[room]) {
        rooms[room] = {};
      }

      await seedUserDisplayNameFromAuth(user.email, user.name);
      const profileFields = await getUserProfileFields(user.email);
      const visibleName =
        (profileFields.display_name && profileFields.display_name.trim()) || user.name;

      // Ensure room exists; first joiner (or first joiner with no existing members) becomes admin
      await ensureRoom(room);
      const existingMembers = await getRoomMembers(room);
      if (existingMembers.length === 0) {
        await upsertMember(room, user.email, 'admin');
      }

      const role = await getMemberRole(room, user.email);
      const isMember = role !== null;

      // Initialize player using DB display name when set
      const name = visibleName;
      rooms[room][socket.id] = {
        id: socket.id,
        email: user.email,
        position: [Math.random() * 5 - 2.5, 0, Math.random() * 5 - 2.5],
        rotation: [0, 0, 0],
        color: getDeterministicColor(name),
        name: name,
        room: room,
        wornPropId: null,
        heldThrowableId: null,
      };

      // Remove stale entries for the same email before sending currentPlayers.
      // The old socket's disconnect event fires asynchronously (after DB awaits above),
      // so this prevents the reconnecting player from seeing their own ghost avatar.
      for (const socketId of Object.keys(rooms[room])) {
        if (rooms[room][socketId].email === user.email && socketId !== socket.id) {
          delete rooms[room][socketId];
          socket.to(room).emit("playerDisconnected", socketId);
        }
      }

      // Send current players in this room to the new player
      socket.emit("currentPlayers", rooms[room]);

      socket.emit("teamPyramidBuffLoaded", {
        expiresAt: activeTeamPyramidBuffExpiresAt(room),
      });

      // Broadcast new player to others in the same room
      socket.to(room).emit("newPlayer", rooms[room][socket.id]);

      // Send persisted paper reams and avatar config to this player
      getPaperReams(user.email).then((count) => {
        socket.emit("paperReamsLoaded", count);
      });
      loadAndSettleFocusEnergy(user.email).then((energy) => {
        // If the client reports lower energy than the server settled (e.g. after
        // idle-regen was applied during a brief disconnect mid-focus-session),
        // honour the client's value so energy never jumps up on reconnect.
        // The client can only lower the value, never raise it, so this is safe.
        const finalEnergy =
          clientFocusEnergy !== null ? Math.min(energy, clientFocusEnergy) : energy;
        socket.emit("focusEnergyLoaded", finalEnergy);
      });
      getAvatarConfig(user.email).then((config) => {
        if (config) {
          rooms[room][socket.id].avatarConfig = config;
          socket.emit("avatarConfigLoaded", config);
          // Broadcast updated player with avatar config to others
          socket.to(room).emit("newPlayer", rooms[room][socket.id]);
        }
      });

      // Desk: only for members (admin/manager/worker)
      if (isMember) {
        ensurePlayerDesk(room, user.email, visibleName)
          .then(async (layout) => {
            socket.emit("roomLayoutLoaded", layout);
            socket.to(room).emit("roomLayoutUpdated", layout);
            await broadcastDeskChairLevels(io, room, layout);
          })
          .catch((err) => {
            console.error("Error ensuring player desk:", err);
            socket.emit("roomLayoutLoaded", []);
          });
      } else {
        // Visitor: send current layout read-only, no desk created
        getRoomLayout(room).then(async (layout) => {
          socket.emit("roomLayoutLoaded", layout);
          const { chairs, monitors } = await getChairAndMonitorLevelsForEmails(
            extractDeskOwnerEmails(layout)
          );
          socket.emit("deskChairLevels", chairs);
          socket.emit("deskMonitorLevels", monitors);
        });
      }

      // Send room info to joining socket
      try {
        const [members, maxWorkers] = await Promise.all([
          getRoomMembers(room),
          getRoomMaxWorkers(room),
        ]);
        const onlineEmails = new Set(
          Object.values(rooms[room]).map((p: any) => p.email)
        );
        socket.emit("roomInfoLoaded", {
          roomId: room,
          maxWorkers,
          myRole: role,
          memberCount: members.length,
          members: members.map(m => ({ ...m, isOnline: onlineEmails.has(m.email) }))
        });
      } catch (err) {
        console.error("Error loading room info:", err);
      }

      console.log(`User ${socket.id} joined room: ${room} (role: ${role ?? 'visitor'})`);
    });

    socket.on("savePaperReams", (count: number) => {
      if (typeof count === 'number' && count >= 0) {
        savePaperReams(user.email, Math.floor(count));
      }
    });

    socket.on(
      "saveFocusEnergy",
      (payload: { energy?: unknown; mode?: unknown; deskOwnerEmail?: unknown }) => {
        const e = payload?.energy;
        const m = payload?.mode;
        if (typeof e !== "number" || !Number.isFinite(e)) return;
        const mode: FocusEnergyMode = m === "focus" ? "focus" : "idle";
        const deskOwner =
          mode === "focus" ? normalizeFocusDeskOwnerEmail(payload?.deskOwnerEmail) : null;
        void saveFocusEnergy(user.email, e, mode, deskOwner);
      }
    );

    socket.on(
      "purchaseChairUpgrade",
      async (ack: (r: unknown) => void) => {
        const respond = typeof ack === "function" ? ack : () => {};
        let playerRoom = "";
        for (const roomId in rooms) {
          if (rooms[roomId][socket.id]) {
            playerRoom = roomId;
            break;
          }
        }
        if (!playerRoom) {
          respond({ ok: false, error: "not_in_room" });
          return;
        }
        try {
          await ensureUserRow(user.email);
          const result = await purchaseChairUpgradeTxn(user.email);
          if (!result.ok) {
            respond(result);
            return;
          }
          socket.emit("paperReamsLoaded", result.paperReams);
          io.to(playerRoom).emit("chairLevelUpdated", {
            email: user.email,
            level: result.chairUpgradeLevel,
          });
          respond({
            ok: true,
            paperReams: result.paperReams,
            chairUpgradeLevel: result.chairUpgradeLevel,
          });
        } catch (e) {
          console.error("purchaseChairUpgrade:", e);
          respond({ ok: false, error: "server_error" });
        }
      }
    );

    socket.on(
      "purchaseMonitorUpgrade",
      async (ack: (r: unknown) => void) => {
        const respond = typeof ack === "function" ? ack : () => {};
        let playerRoom = "";
        for (const roomId in rooms) {
          if (rooms[roomId][socket.id]) {
            playerRoom = roomId;
            break;
          }
        }
        if (!playerRoom) {
          respond({ ok: false, error: "not_in_room" });
          return;
        }
        try {
          await ensureUserRow(user.email);
          const result = await purchaseMonitorUpgradeTxn(user.email);
          if (!result.ok) {
            respond(result);
            return;
          }
          socket.emit("paperReamsLoaded", result.paperReams);
          io.to(playerRoom).emit("monitorLevelUpdated", {
            email: user.email,
            level: result.monitorUpgradeLevel,
          });
          respond({
            ok: true,
            paperReams: result.paperReams,
            monitorUpgradeLevel: result.monitorUpgradeLevel,
          });
        } catch (e) {
          console.error("purchaseMonitorUpgrade:", e);
          respond({ ok: false, error: "server_error" });
        }
      }
    );

    socket.on(
      "purchaseTeamPyramid",
      async (ack: (r: unknown) => void) => {
        const respond = typeof ack === "function" ? ack : () => {};
        let playerRoom = "";
        for (const roomId in rooms) {
          if (rooms[roomId][socket.id]) {
            playerRoom = roomId;
            break;
          }
        }
        if (!playerRoom) {
          respond({ ok: false, error: "not_in_room" });
          return;
        }
        try {
          await ensureUserRow(user.email);
          const result = await purchaseTeamPyramidTxn(user.email);
          if (!result.ok) {
            respond(result);
            return;
          }
          const extensionBase = activeTeamPyramidBuffExpiresAt(playerRoom) ?? Date.now();
          const expiresAt = extensionBase + TEAM_PYRAMID_DURATION_MS;
          roomTeamPyramidBuffExpiresAt[playerRoom] = expiresAt;
          socket.emit("paperReamsLoaded", result.paperReams);
          io.to(playerRoom).emit("teamPyramidBuffUpdated", { expiresAt });
          io.to(playerRoom).emit("chatMessage", systemChatMessage(TEAM_PYRAMID_SYSTEM_CHAT_TEXT));
          respond({
            ok: true,
            paperReams: result.paperReams,
            expiresAt,
          });
        } catch (e) {
          console.error("purchaseTeamPyramid:", e);
          respond({ ok: false, error: "server_error" });
        }
      }
    );

    socket.on("playerWornProp", (data: { propId: string | null }) => {
      let playerRoom = "";
      for (const roomId in rooms) {
        if (rooms[roomId][socket.id]) {
          playerRoom = roomId;
          break;
        }
      }
      if (!playerRoom || !rooms[playerRoom][socket.id]) return;
      const pid = data?.propId ?? null;
      if (pid !== null && pid !== "ms_body") return;
      rooms[playerRoom][socket.id].wornPropId = pid;
      if (pid !== null) {
        rooms[playerRoom][socket.id].heldThrowableId = null;
      }
      socket.to(playerRoom).emit("playerMoved", rooms[playerRoom][socket.id]);
    });

    socket.on("playerHeldThrowable", (data: { propId: string | null }) => {
      let playerRoom = "";
      for (const roomId in rooms) {
        if (rooms[roomId][socket.id]) {
          playerRoom = roomId;
          break;
        }
      }
      if (!playerRoom || !rooms[playerRoom][socket.id]) return;
      const propId = data?.propId ?? null;
      if (!isAllowedHeldThrowableId(propId)) return;
      rooms[playerRoom][socket.id].heldThrowableId = propId;
      socket.to(playerRoom).emit("playerMoved", rooms[playerRoom][socket.id]);
    });

    socket.on("playerIceCream", (data: { flavorIndex: number | null; expiresAt: number | null }) => {
      let playerRoom = "";
      for (const roomId in rooms) {
        if (rooms[roomId][socket.id]) {
          playerRoom = roomId;
          break;
        }
      }
      if (!playerRoom || !rooms[playerRoom][socket.id]) return;
      const player = rooms[playerRoom][socket.id];
      const fi = data?.flavorIndex;
      const ex = data?.expiresAt;
      if (fi == null || ex == null) {
        delete player.iceCreamFlavorIndex;
        delete player.iceCreamExpiresAt;
      } else {
        const fiNum = typeof fi === "number" ? fi : Number(fi);
        const exNum = typeof ex === "number" ? ex : Number(ex);
        if (!Number.isFinite(fiNum) || fiNum !== Math.floor(fiNum) || fiNum < 0 || fiNum > 4) return;
        if (!Number.isFinite(exNum)) return;
        const now = Date.now();
        // Allow client/server clock skew (±several minutes); duration is ~1 min client-side.
        if (exNum < now - 180_000 || exNum > now + 8 * 60_000) return;
        player.iceCreamFlavorIndex = fiNum;
        player.iceCreamExpiresAt = exNum;
      }
      socket.to(playerRoom).emit("playerMoved", player);
    });

    socket.on("throwableRestSync", (data: { throwableId: string; position: number[]; rotation: number[] }) => {
      let playerRoom = "";
      for (const roomId in rooms) {
        if (rooms[roomId][socket.id]) {
          playerRoom = roomId;
          break;
        }
      }
      if (!playerRoom) return;
      if (!data || data.throwableId !== "ms_body") return;
      const { position, rotation } = data;
      if (!Array.isArray(position) || position.length !== 3) return;
      if (!Array.isArray(rotation) || rotation.length !== 3) return;
      socket.to(playerRoom).emit("throwableRestSync", data);
    });

    socket.on("saveAvatarConfig", (config: AvatarConfig) => {
      if (!config || typeof config !== 'object') return;
      const { shirtColor, skinTone, pantColor } = config;
      if (typeof shirtColor !== 'string' || typeof skinTone !== 'string' || typeof pantColor !== 'string') return;
      const sanitized: AvatarConfig = { shirtColor, skinTone, pantColor };
      saveAvatarConfig(user.email, sanitized);
      // Update in-memory state and broadcast to room
      let playerRoom = "";
      for (const roomId in rooms) {
        if (rooms[roomId][socket.id]) { playerRoom = roomId; break; }
      }
      if (playerRoom && rooms[playerRoom][socket.id]) {
        rooms[playerRoom][socket.id].avatarConfig = sanitized;
        socket.to(playerRoom).emit("playerMoved", rooms[playerRoom][socket.id]);
      }
    });

    socket.on("chatMessage", (messageText: string) => {
      let playerRoom = "";
      for (const roomId in rooms) {
        if (rooms[roomId][socket.id]) {
          playerRoom = roomId;
          break;
        }
      }

      if (playerRoom && rooms[playerRoom][socket.id]) {
        const player = rooms[playerRoom][socket.id];
        const message = {
          id: Math.random().toString(36).substring(7),
          playerId: socket.id,
          playerName: player.name,
          text: messageText,
          time: Date.now()
        };
        
        // Store last message on player for bubbles
        player.lastMessage = messageText;
        player.lastMessageTime = message.time;

        io.to(playerRoom).emit("chatMessage", message);
      }
    });

    socket.on("playerMovement", (movementData) => {
      // Find which room the player is in
      let playerRoom = "";
      for (const roomId in rooms) {
        if (rooms[roomId][socket.id]) {
          playerRoom = roomId;
          break;
        }
      }

      if (playerRoom && rooms[playerRoom][socket.id]) {
        rooms[playerRoom][socket.id].position = movementData.position;
        rooms[playerRoom][socket.id].rotation = movementData.rotation;
        rooms[playerRoom][socket.id].isRolling = movementData.isRolling;
        rooms[playerRoom][socket.id].rollTimer = movementData.rollTimer;
        socket.to(playerRoom).emit("playerMoved", rooms[playerRoom][socket.id]);
      }
    });

    socket.on("playerFocusUpdate", (data: {
      isFocused: boolean;
      focusProgress: number;
      activeDeskId: string | null;
      focusSitPoseIndex?: number;
    }) => {
      let playerRoom = "";
      for (const roomId in rooms) {
        if (rooms[roomId][socket.id]) {
          playerRoom = roomId;
          break;
        }
      }

      if (playerRoom && rooms[playerRoom][socket.id]) {
        const player = rooms[playerRoom][socket.id];
        const wasFocused = !!player.isFocused;
        const prevDeskId =
          typeof player.activeDeskId === "string" ? player.activeDeskId : null;
        const nextFocused = !!data.isFocused;
        const nextDeskId =
          typeof data.activeDeskId === "string" ? data.activeDeskId : null;
        const startedOrSwitchedDesk =
          nextFocused && !!nextDeskId && (!wasFocused || prevDeskId !== nextDeskId);

        if (startedOrSwitchedDesk) {
          void getRoomLayout(playerRoom)
            .then((layout) => {
              const deskOwnerEmail = deskOwnerEmailByDeskId(layout, nextDeskId);
              const sittingPlayerEmail = typeof player.email === "string" ? player.email : user.email;
              if (
                deskOwnerEmail &&
                deskOwnerEmail.toLowerCase() !== sittingPlayerEmail.toLowerCase()
              ) {
                io.to(playerRoom).emit(
                  "chatMessage",
                  systemChatMessage(IDENTITY_THEFT_SYSTEM_CHAT_TEXT)
                );
              }
            })
            .catch((err) => {
              console.error("playerFocusUpdate identity-theft warning failed:", err);
            });
        }

        player.isFocused = data.isFocused;
        player.focusProgress = data.focusProgress;
        player.activeDeskId = data.activeDeskId;
        if (data.isFocused && typeof data.focusSitPoseIndex === "number") {
          player.focusSitPoseIndex = data.focusSitPoseIndex;
        } else {
          delete player.focusSitPoseIndex;
        }
        socket.to(playerRoom).emit("playerMoved", player);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      if (user?.email) {
        void settleFocusEnergyOnDisconnect(user.email);
      }

      if (user?.email && activeUsers.get(user.email) === socket.id) {
        activeUsers.delete(user.email);
      }

      for (const roomId in rooms) {
        if (rooms[roomId][socket.id]) {
          delete rooms[roomId][socket.id];
          io.to(roomId).emit("playerDisconnected", socket.id);
          
          // Clean up empty rooms
          if (Object.keys(rooms[roomId]).length === 0) {
            delete rooms[roomId];
          }
          break;
        }
      }
    });
  });

  const waterCoolerGossipTurn: Record<string, number> = {};
  const [wcX, , wcZ] = WATER_COOLER_WORLD_POSITION;

  setInterval(() => {
    for (const roomId of Object.keys(rooms)) {
      const roomPlayers = rooms[roomId];
      if (!roomPlayers) continue;

      const nearIds: string[] = [];
      for (const socketId of Object.keys(roomPlayers)) {
        const p = roomPlayers[socketId];
        if (!p?.position || !Array.isArray(p.position) || p.position.length < 3) continue;
        const dx = p.position[0] - wcX;
        const dz = p.position[2] - wcZ;
        if (Math.sqrt(dx * dx + dz * dz) < WATER_COOLER_RADIUS) {
          nearIds.push(socketId);
        }
      }
      nearIds.sort();
      if (nearIds.length < 2) continue;

      const turn = waterCoolerGossipTurn[roomId] ?? 0;
      const speakerId = nearIds[turn % nearIds.length];
      waterCoolerGossipTurn[roomId] = turn + 1;
      const time = Date.now();
      const speaker = roomPlayers[speakerId];
      if (speaker) {
        speaker.lastMessage = "Gossip Gossip";
        speaker.lastMessageTime = time;
      }
      io.to(roomId).emit("ambientSpeech", {
        playerId: speakerId,
        text: "Gossip Gossip",
        time,
      });
    }
  }, 3000);

  let vite: ViteDevServer | null = null;

  // Vite middleware for development; skipped in test (NODE_ENV=test set by Vitest)
  if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
    vite = await createViteServer({
      server: {
        middlewareMode: true,
        // Reuse the same HTTP server so HMR shares PORT (no separate 24678/24679).
        hmr:
          process.env.DISABLE_HMR === "true"
            ? false
            : { server: httpServer },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    const publicPath = path.join(__dirname, "public");
    console.log(`Serving static files from: ${distPath}`);
    console.log(`dist/index.html exists: ${fs.existsSync(path.join(distPath, "index.html"))}`);
    console.log(`dist/assets/dwight_bobblehead.glb exists: ${fs.existsSync(path.join(distPath, "assets", "dwight_bobblehead.glb"))}`);
    console.log(`dist/assets/dundie.glb exists: ${fs.existsSync(path.join(distPath, "assets", "dundie.glb"))}`);
    // Serve dist/ first (hashed JS/CSS bundles), then fall back to public/ for
    // assets that Vite copies as-is (GLB files). This ensures large binary assets
    // are reachable even if the dist/ copy was incomplete during build.
    app.use(express.static(distPath));
    app.use(express.static(publicPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    // Log the exact error from express.static so we know why files are failing
    app.use((err: any, req: any, res: any, _next: any) => {
      console.error(`[static error] ${req.method} ${req.url} → code=${err.code} status=${err.status} msg=${err.message}`);
      res.status(err.status || 500).send(err.message || 'Internal Server Error');
    });
  }

  return { app, httpServer, io, vite };
}

// ── Auto-start (only when run directly, not when imported by tests) ───────────

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
  createApp()
    .then(({ httpServer, io, vite }) => {
      httpServer.once("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          console.error(
            `Port ${PORT} is already in use (another \`npm run dev\`?). Close it or set PORT=8081 in .env.local.`
          );
        }
      });
      httpServer.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);

        if (isLocalTestEnabled()) {
          const raw = process.env.LOCAL_TEST_TTL_MS;
          const ttlMs =
            raw === undefined || raw === ""
              ? 180_000
              : parseInt(raw, 10);
          if (Number.isFinite(ttlMs) && ttlMs > 0) {
            console.log(
              `[LOCAL_TEST] will exit in ${ttlMs / 1000}s (LOCAL_TEST_TTL_MS=0 to disable)`
            );
            setTimeout(() => {
              console.log("[LOCAL_TEST] shutting down...");
              void (async () => {
                io.disconnectSockets(true);
                await new Promise<void>((resolve) => {
                  io.close(() => resolve());
                });
                if (vite) {
                  await vite.close();
                }
                httpServer.closeAllConnections?.();
                httpServer.close(() => process.exit(0));
              })();
            }, ttlMs);
          }
        }
      });
    })
    .catch((err) => {
      console.error("Failed to start server:", err);
      process.exit(1);
    });
}
