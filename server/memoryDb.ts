/** In-memory DB for LOCAL_TEST=1 only. Not used when PostgreSQL is active. */

import { MONITOR_UPGRADE_MAX_LEVEL, monitorUpgradeCostForNextLevel } from "../src/monitorUpgradeConstants.js";
import { totalPaperReamsEarnedFloor } from "../src/paperReamsLifetime.js";
import {
  clampFocusEnergy,
  settleFocusEnergy,
  parseFocusEnergyMode,
  type FocusEnergyMode,
} from "../src/focusEnergyModel.js";

/** Starting paper reams for each mock player in local test mode. */
export const LOCAL_TEST_INITIAL_PAPER_REAMS = 1000;

export interface FurnitureItem {
  id: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
  config: Record<string, unknown>;
}

export interface AvatarConfig {
  shirtColor: string;
  skinTone: string;
  pantColor: string;
}

type RoomRole = "admin" | "manager" | "worker";

interface UserRow {
  paper_reams: number;
  /** Lifetime paper earned (balance + spent); leaderboard stat. */
  total_paper_reams_earned: number;
  avatar_config: Record<string, unknown>;
  display_name: string | null;
  job_title: string | null;
  chair_upgrade_level: number;
  monitor_upgrade_level: number;
  focus_energy: number;
  focus_energy_updated_at: number;
  focus_energy_mode: FocusEnergyMode;
}

interface RoomRow {
  max_workers: number;
  created_at: Date;
}

const users = new Map<string, UserRow>();
const roomLayouts = new Map<string, FurnitureItem[]>();
const rooms = new Map<string, RoomRow>();
/** roomId -> email -> { role, joined_at } */
const roomMembers = new Map<string, Map<string, { role: RoomRole; joined_at: Date }>>();

function getMemberMap(roomId: string): Map<string, { role: RoomRole; joined_at: Date }> {
  let m = roomMembers.get(roomId);
  if (!m) {
    m = new Map();
    roomMembers.set(roomId, m);
  }
  return m;
}

export async function memGetPaperReams(email: string): Promise<number> {
  const row = users.get(email);
  if (row) return row.paper_reams;
  return LOCAL_TEST_INITIAL_PAPER_REAMS;
}

function defaultUserRow(): UserRow {
  const now = Date.now();
  return {
    paper_reams: LOCAL_TEST_INITIAL_PAPER_REAMS,
    total_paper_reams_earned: LOCAL_TEST_INITIAL_PAPER_REAMS,
    avatar_config: {},
    display_name: null,
    job_title: null,
    chair_upgrade_level: 0,
    monitor_upgrade_level: 0,
    focus_energy: 100,
    focus_energy_updated_at: now,
    focus_energy_mode: "idle",
  };
}

export async function memSavePaperReams(email: string, count: number): Promise<void> {
  const u = users.get(email) ?? defaultUserRow();
  if (typeof u.total_paper_reams_earned !== "number") {
    u.total_paper_reams_earned = u.paper_reams;
  }
  const prev = u.paper_reams;
  const c = Math.floor(count);
  if (c > prev) {
    u.total_paper_reams_earned += c - prev;
  }
  u.paper_reams = c;
  users.set(email, u);
}

export async function memGetAvatarConfig(email: string): Promise<AvatarConfig | null> {
  const config = users.get(email)?.avatar_config;
  if (!config || Object.keys(config).length === 0) return null;
  return config as unknown as AvatarConfig;
}

export async function memSaveAvatarConfig(email: string, config: AvatarConfig): Promise<void> {
  const u = users.get(email) ?? defaultUserRow();
  u.avatar_config = { ...config };
  users.set(email, u);
}

export async function memGetRoomLayout(roomId: string): Promise<FurnitureItem[]> {
  return roomLayouts.get(roomId) ?? [];
}

export async function memSaveRoomLayout(roomId: string, layout: FurnitureItem[]): Promise<void> {
  roomLayouts.set(roomId, layout);
}

export async function memEnsureRoom(roomId: string): Promise<boolean> {
  if (rooms.has(roomId)) return false;
  rooms.set(roomId, { max_workers: 20, created_at: new Date() });
  return true;
}

export async function memGetMemberRole(roomId: string, email: string): Promise<RoomRole | null> {
  return getMemberMap(roomId).get(email)?.role ?? null;
}

export async function memUpsertMember(roomId: string, email: string, role: RoomRole): Promise<void> {
  const m = getMemberMap(roomId);
  const existing = m.get(email);
  m.set(email, {
    role,
    joined_at: existing?.joined_at ?? new Date(),
  });
}

export async function memRemoveMember(roomId: string, email: string): Promise<void> {
  getMemberMap(roomId).delete(email);
}

export async function memGetRoomMembers(
  roomId: string
): Promise<
  Array<{ email: string; name: string | null; jobTitle: string | null; role: string; joinedAt: Date }>
> {
  const m = getMemberMap(roomId);
  const list: Array<{
    email: string;
    name: string | null;
    jobTitle: string | null;
    role: string;
    joinedAt: Date;
  }> = [];
  for (const [email, row] of m) {
    const u = users.get(email);
    list.push({
      email,
      name: u?.display_name ?? null,
      jobTitle: u?.job_title ?? null,
      role: row.role,
      joinedAt: row.joined_at,
    });
  }
  list.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
  return list;
}

export async function memGetRoomLeaderboard(
  roomId: string
): Promise<
  Array<{ email: string; name: string | null; jobTitle: string | null; role: string; totalReamsEarned: number }>
> {
  const m = getMemberMap(roomId);
  const list: Array<{
    email: string;
    name: string | null;
    jobTitle: string | null;
    role: string;
    totalReamsEarned: number;
  }> = [];
  for (const [email, row] of m) {
    const u = users.get(email);
    const balance = u?.paper_reams ?? LOCAL_TEST_INITIAL_PAPER_REAMS;
    const totalEarned = u?.total_paper_reams_earned ?? balance;
    list.push({
      email,
      name: u?.display_name ?? null,
      jobTitle: u?.job_title ?? null,
      role: row.role,
      totalReamsEarned: totalEarned,
    });
  }
  list.sort((a, b) => b.totalReamsEarned - a.totalReamsEarned);
  return list;
}

export async function memGetMyRooms(
  email: string
): Promise<Array<{ roomId: string; role: string; maxWorkers: number }>> {
  const out: Array<{
    roomId: string;
    role: string;
    maxWorkers: number;
    joinedAt: Date;
  }> = [];
  for (const [roomId, m] of roomMembers) {
    const row = m.get(email);
    if (!row) continue;
    const r = rooms.get(roomId);
    out.push({
      roomId,
      role: row.role,
      maxWorkers: r?.max_workers ?? 20,
      joinedAt: row.joined_at,
    });
  }
  out.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
  return out.map(({ joinedAt: _j, ...rest }) => rest);
}

export async function memGetRoomMaxWorkers(roomId: string): Promise<number> {
  return rooms.get(roomId)?.max_workers ?? 20;
}

export async function memGetRoomMemberCount(roomId: string): Promise<number> {
  return getMemberMap(roomId).size;
}

export async function memEnsureUser(email: string): Promise<void> {
  if (users.has(email)) return;
  users.set(email, defaultUserRow());
}

function patchFocusEnergyFields(u: UserRow): void {
  if (typeof u.focus_energy !== "number" || !Number.isFinite(u.focus_energy)) {
    u.focus_energy = 100;
  }
  if (typeof u.focus_energy_updated_at !== "number" || !Number.isFinite(u.focus_energy_updated_at)) {
    u.focus_energy_updated_at = Date.now();
  }
  if (u.focus_energy_mode !== "focus" && u.focus_energy_mode !== "idle") {
    u.focus_energy_mode = "idle";
  }
}

/** Settle from stored row to now, persist snapshot, return display energy. */
export async function memLoadAndSettleFocusEnergy(email: string): Promise<number> {
  const u = users.get(email) ?? defaultUserRow();
  patchFocusEnergyFields(u);
  const now = Date.now();
  const mode = parseFocusEnergyMode(u.focus_energy_mode);
  const chairLv = mode === "focus" ? u.chair_upgrade_level : 0;
  const settled = settleFocusEnergy(u.focus_energy, u.focus_energy_updated_at, now, mode, chairLv);
  u.focus_energy = settled;
  u.focus_energy_updated_at = now;
  u.focus_energy_mode = mode;
  users.set(email, u);
  return settled;
}

export async function memSaveFocusEnergy(
  email: string,
  energy: number,
  mode: FocusEnergyMode
): Promise<void> {
  const u = users.get(email) ?? defaultUserRow();
  patchFocusEnergyFields(u);
  u.focus_energy = clampFocusEnergy(energy);
  u.focus_energy_updated_at = Date.now();
  u.focus_energy_mode = mode === "focus" ? "focus" : "idle";
  users.set(email, u);
}

/** On socket disconnect: settle to now with last mode, then force idle for offline regen. */
export async function memSettleFocusEnergyOnDisconnect(email: string): Promise<void> {
  const u = users.get(email);
  if (!u) return;
  patchFocusEnergyFields(u);
  const now = Date.now();
  const mode = parseFocusEnergyMode(u.focus_energy_mode);
  const chairLv = mode === "focus" ? u.chair_upgrade_level : 0;
  const settled = settleFocusEnergy(u.focus_energy, u.focus_energy_updated_at, now, mode, chairLv);
  u.focus_energy = settled;
  u.focus_energy_updated_at = now;
  u.focus_energy_mode = "idle";
  users.set(email, u);
}

/** Sets display_name from auth only when the user has no display_name yet (matches PG COALESCE seed). */
export async function memSeedUserDisplayNameIfEmpty(email: string, fallbackDisplayName: string): Promise<void> {
  const u = users.get(email) ?? defaultUserRow();
  if (u.display_name == null || u.display_name === "") {
    u.display_name = fallbackDisplayName;
  }
  users.set(email, u);
}

export async function memGetUserProfileFields(
  email: string
): Promise<{ display_name: string | null; job_title: string | null }> {
  const u = users.get(email);
  return {
    display_name: u?.display_name ?? null,
    job_title: u?.job_title ?? null,
  };
}

export async function memSaveUserProfileFields(
  email: string,
  displayName: string,
  jobTitle: string | null
): Promise<void> {
  const u = users.get(email) ?? defaultUserRow();
  u.display_name = displayName;
  u.job_title = jobTitle;
  users.set(email, u);
}

const CHAIR_MAX = 20;

export async function memGetChairLevelsForEmails(emails: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const e of emails) {
    const row = users.get(e);
    const lv = row?.chair_upgrade_level ?? 0;
    out[e] = Math.min(CHAIR_MAX, Math.max(0, Math.floor(lv)));
  }
  return out;
}

export type MemChairPurchaseResult =
  | { ok: true; paperReams: number; chairUpgradeLevel: number }
  | { ok: false; error: 'max_level' | 'insufficient' };

export async function memPurchaseChairUpgrade(
  email: string,
  costReams: number
): Promise<MemChairPurchaseResult> {
  const u = users.get(email) ?? defaultUserRow();
  let level = Math.min(CHAIR_MAX, Math.max(0, Math.floor(u.chair_upgrade_level)));
  if (level >= CHAIR_MAX) return { ok: false, error: 'max_level' };
  if (u.paper_reams < costReams) return { ok: false, error: 'insufficient' };
  u.paper_reams -= costReams;
  u.chair_upgrade_level = level + 1;
  u.total_paper_reams_earned = Math.max(
    u.total_paper_reams_earned,
    totalPaperReamsEarnedFloor(u.paper_reams, u.chair_upgrade_level, u.monitor_upgrade_level)
  );
  users.set(email, u);
  return { ok: true, paperReams: u.paper_reams, chairUpgradeLevel: u.chair_upgrade_level };
}

const MONITOR_MAX = MONITOR_UPGRADE_MAX_LEVEL;

export async function memGetMonitorLevelsForEmails(emails: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const e of emails) {
    const row = users.get(e);
    const lv = row?.monitor_upgrade_level ?? 0;
    out[e] = Math.min(MONITOR_MAX, Math.max(0, Math.floor(lv)));
  }
  return out;
}

export type MemMonitorPurchaseResult =
  | { ok: true; paperReams: number; monitorUpgradeLevel: number }
  | { ok: false; error: 'max_level' | 'insufficient' };

export async function memPurchaseMonitorUpgrade(email: string): Promise<MemMonitorPurchaseResult> {
  const u = users.get(email) ?? defaultUserRow();
  let level = Math.min(MONITOR_MAX, Math.max(0, Math.floor(u.monitor_upgrade_level)));
  if (level >= MONITOR_MAX) return { ok: false, error: "max_level" };
  const costReams = monitorUpgradeCostForNextLevel(level);
  if (u.paper_reams < costReams) return { ok: false, error: "insufficient" };
  u.paper_reams -= costReams;
  u.monitor_upgrade_level = level + 1;
  u.total_paper_reams_earned = Math.max(
    u.total_paper_reams_earned,
    totalPaperReamsEarnedFloor(u.paper_reams, u.chair_upgrade_level, u.monitor_upgrade_level)
  );
  users.set(email, u);
  return { ok: true, paperReams: u.paper_reams, monitorUpgradeLevel: u.monitor_upgrade_level };
}

export async function memUpdateRoomMaxWorkers(roomId: string, maxWorkers: number): Promise<void> {
  const r = rooms.get(roomId);
  if (r) {
    r.max_workers = maxWorkers;
  } else {
    rooms.set(roomId, { max_workers: maxWorkers, created_at: new Date() });
  }
}
