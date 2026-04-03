/** In-memory DB for LOCAL_TEST=1 only. Not used when PostgreSQL is active. */

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
  avatar_config: Record<string, unknown>;
  display_name: string | null;
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
  return users.get(email)?.paper_reams ?? 0;
}

export async function memSavePaperReams(email: string, count: number): Promise<void> {
  const u = users.get(email) ?? {
    paper_reams: 0,
    avatar_config: {},
    display_name: null,
  };
  u.paper_reams = count;
  users.set(email, u);
}

export async function memGetAvatarConfig(email: string): Promise<AvatarConfig | null> {
  const config = users.get(email)?.avatar_config;
  if (!config || Object.keys(config).length === 0) return null;
  return config as unknown as AvatarConfig;
}

export async function memSaveAvatarConfig(email: string, config: AvatarConfig): Promise<void> {
  const u = users.get(email) ?? {
    paper_reams: 0,
    avatar_config: {},
    display_name: null,
  };
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
): Promise<Array<{ email: string; name: string | null; role: string; joinedAt: Date }>> {
  const m = getMemberMap(roomId);
  const list: Array<{ email: string; name: string | null; role: string; joinedAt: Date }> = [];
  for (const [email, row] of m) {
    list.push({
      email,
      name: users.get(email)?.display_name ?? null,
      role: row.role,
      joinedAt: row.joined_at,
    });
  }
  list.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
  return list;
}

export async function memGetRoomLeaderboard(
  roomId: string
): Promise<Array<{ email: string; name: string | null; role: string; paperReams: number }>> {
  const m = getMemberMap(roomId);
  const list: Array<{ email: string; name: string | null; role: string; paperReams: number }> = [];
  for (const [email, row] of m) {
    list.push({
      email,
      name: users.get(email)?.display_name ?? null,
      role: row.role,
      paperReams: users.get(email)?.paper_reams ?? 0,
    });
  }
  list.sort((a, b) => b.paperReams - a.paperReams);
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
  users.set(email, { paper_reams: 0, avatar_config: {}, display_name: null });
}

export async function memUpsertUserDisplayName(email: string, displayName: string): Promise<void> {
  const u = users.get(email) ?? {
    paper_reams: 0,
    avatar_config: {},
    display_name: null,
  };
  u.display_name = displayName;
  users.set(email, u);
}

export async function memUpdateRoomMaxWorkers(roomId: string, maxWorkers: number): Promise<void> {
  const r = rooms.get(roomId);
  if (r) {
    r.max_workers = maxWorkers;
  } else {
    rooms.set(roomId, { max_workers: maxWorkers, created_at: new Date() });
  }
}
