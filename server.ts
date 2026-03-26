import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import fs from "fs";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { WORKING_AREA_BOUNDS, DESK_SPAWN_MARGIN, DESK_SPAWN_SPACING } from "./src/officeLayout.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Database ────────────────────────────────────────────────────────────────
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      email       TEXT PRIMARY KEY,
      paper_reams INTEGER NOT NULL DEFAULT 0
    )
  `);
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_config JSONB NOT NULL DEFAULT '{}'
  `);
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS room_layouts (
      room_id TEXT PRIMARY KEY,
      layout  JSONB NOT NULL DEFAULT '[]'
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      room_id     TEXT PRIMARY KEY,
      max_workers INTEGER NOT NULL DEFAULT 20,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS room_members (
      room_id   TEXT NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
      email     TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      role      TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'worker')),
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (room_id, email)
    )
  `);
}

async function getPaperReams(email: string): Promise<number> {
  const { rows } = await pool.query(
    'SELECT paper_reams FROM users WHERE email = $1',
    [email]
  );
  return rows[0]?.paper_reams ?? 0;
}

async function savePaperReams(email: string, count: number): Promise<void> {
  await pool.query(
    `INSERT INTO users (email, paper_reams) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET paper_reams = EXCLUDED.paper_reams`,
    [email, count]
  );
}

interface AvatarConfig {
  shirtColor: string;
  skinTone: string;
  pantColor: string;
}

async function getAvatarConfig(email: string): Promise<AvatarConfig | null> {
  const { rows } = await pool.query(
    'SELECT avatar_config FROM users WHERE email = $1',
    [email]
  );
  const config = rows[0]?.avatar_config;
  if (!config || Object.keys(config).length === 0) return null;
  return config as AvatarConfig;
}


async function saveAvatarConfig(email: string, config: AvatarConfig): Promise<void> {
  await pool.query(
    `INSERT INTO users (email, avatar_config) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET avatar_config = EXCLUDED.avatar_config`,
    [email, JSON.stringify(config)]
  );
}

// ── Room Layout ───────────────────────────────────────────────────────────────

interface FurnitureItem {
  id: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
  config: Record<string, unknown>;
}

interface DeskItem extends FurnitureItem {
  type: 'desk';
  config: { ownerEmail: string; ownerName: string; [key: string]: unknown };
}

async function getRoomLayout(roomId: string): Promise<FurnitureItem[]> {
  const { rows } = await pool.query(
    'SELECT layout FROM room_layouts WHERE room_id = $1',
    [roomId]
  );
  return (rows[0]?.layout as FurnitureItem[]) ?? [];
}

async function saveRoomLayout(roomId: string, layout: FurnitureItem[]): Promise<void> {
  await pool.query(
    `INSERT INTO room_layouts (room_id, layout) VALUES ($1, $2)
     ON CONFLICT (room_id) DO UPDATE SET layout = EXCLUDED.layout`,
    [roomId, JSON.stringify(layout)]
  );
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

async function ensurePlayerDesk(roomId: string, email: string, name: string): Promise<FurnitureItem[]> {
  const layout = await getRoomLayout(roomId);
  const existingDesk = layout.find(
    (f) => f.type === 'desk' && (f as DeskItem).config.ownerEmail === email
  );
  if (existingDesk) return layout;

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

// ── Room Management ───────────────────────────────────────────────────────────

type RoomRole = 'admin' | 'manager' | 'worker';

async function ensureRoom(roomId: string): Promise<boolean> {
  const result = await pool.query(
    `INSERT INTO rooms (room_id) VALUES ($1) ON CONFLICT (room_id) DO NOTHING RETURNING room_id`,
    [roomId]
  );
  return (result.rowCount ?? 0) > 0;
}

async function getMemberRole(roomId: string, email: string): Promise<RoomRole | null> {
  const { rows } = await pool.query(
    'SELECT role FROM room_members WHERE room_id = $1 AND email = $2',
    [roomId, email]
  );
  return (rows[0]?.role as RoomRole) ?? null;
}

async function upsertMember(roomId: string, email: string, role: RoomRole): Promise<void> {
  await pool.query(
    `INSERT INTO room_members (room_id, email, role) VALUES ($1, $2, $3)
     ON CONFLICT (room_id, email) DO UPDATE SET role = EXCLUDED.role`,
    [roomId, email, role]
  );
}

async function removeMember(roomId: string, email: string): Promise<void> {
  await pool.query(
    'DELETE FROM room_members WHERE room_id = $1 AND email = $2',
    [roomId, email]
  );
}

async function getRoomMembers(roomId: string): Promise<Array<{ email: string; name: string | null; role: string; joinedAt: Date }>> {
  const { rows } = await pool.query(
    `SELECT rm.email, u.display_name as name, rm.role, rm.joined_at as "joinedAt"
     FROM room_members rm
     LEFT JOIN users u ON u.email = rm.email
     WHERE rm.room_id = $1
     ORDER BY rm.joined_at ASC`,
    [roomId]
  );
  return rows;
}

async function getRoomLeaderboard(roomId: string): Promise<Array<{ email: string; name: string | null; role: string; paperReams: number }>> {
  const { rows } = await pool.query(
    `SELECT rm.email, u.display_name as name, rm.role, COALESCE(u.paper_reams, 0) as "paperReams"
     FROM room_members rm
     LEFT JOIN users u ON u.email = rm.email
     WHERE rm.room_id = $1
     ORDER BY u.paper_reams DESC NULLS LAST`,
    [roomId]
  );
  return rows;
}

async function getMyRooms(email: string): Promise<Array<{ roomId: string; role: string; maxWorkers: number }>> {
  const { rows } = await pool.query(
    `SELECT rm.room_id as "roomId", rm.role, r.max_workers as "maxWorkers"
     FROM room_members rm
     JOIN rooms r ON r.room_id = rm.room_id
     WHERE rm.email = $1
     ORDER BY rm.joined_at ASC`,
    [email]
  );
  return rows;
}

// ── Config ───────────────────────────────────────────────────────────────────

// Extract user from IAP-injected headers (X-Goog-Authenticated-User-Email).
// Falls back to DEV_USER_EMAIL for local development without IAP.
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
  return null;
}

async function startServer() {
  await initDb();
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

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;

  // Track active users by email to prevent multiple sessions
  const activeUsers = new Map<string, string>(); // email -> socketId

  // Auth Routes
  app.get("/api/auth/me", (req, res) => {
    res.json((req as any).user || null);
  });

  app.get("/api/player", async (req, res) => {
    const user = (req as any).user;
    if (!user?.email) return res.status(401).json({ error: "Unauthorized" });
    const [paperReams, avatarConfig] = await Promise.all([
      getPaperReams(user.email),
      getAvatarConfig(user.email),
    ]);
    res.json({ paperReams, avatarConfig });
  });

  app.post("/api/avatar", express.json(), async (req, res) => {
    const user = (req as any).user;
    if (!user?.email) return res.status(401).json({ error: "Unauthorized" });
    const { shirtColor, skinTone, pantColor } = req.body ?? {};
    if (typeof shirtColor !== 'string' || typeof skinTone !== 'string' || typeof pantColor !== 'string') {
      return res.status(400).json({ error: "Invalid avatar config" });
    }
    await saveAvatarConfig(user.email, { shirtColor, skinTone, pantColor });
    res.json({ ok: true });
  });

  app.post("/api/room-layout", express.json(), async (req, res) => {
    const user = (req as any).user;
    if (!user?.email) return res.status(401).json({ error: "Unauthorized" });
    const { roomId, layout } = req.body ?? {};
    if (typeof roomId !== 'string' || !Array.isArray(layout)) {
      return res.status(400).json({ error: "Invalid layout" });
    }
    await saveRoomLayout(roomId, layout as FurnitureItem[]);
    io.to(roomId).emit("roomLayoutUpdated", layout);
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
      const [membersResult, roomRow] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM room_members WHERE room_id = $1', [roomId]),
        pool.query('SELECT max_workers FROM rooms WHERE room_id = $1', [roomId])
      ]);
      const currentCount = parseInt(membersResult.rows[0].count);
      const maxWorkers = roomRow.rows[0]?.max_workers ?? 20;
      if (currentCount >= maxWorkers) {
        return res.status(409).json({ error: "Room is at capacity" });
      }
      // Ensure user row exists before adding to room_members
      await pool.query(
        `INSERT INTO users (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`,
        [email]
      );
      await upsertMember(roomId, email, role as RoomRole);
      // If the new member is currently online, give them a desk and notify them
      const onlineEntry = Object.entries(rooms[roomId] ?? {})
        .find(([, p]: [string, any]) => p.email === email);
      if (onlineEntry) {
        const layout = await ensurePlayerDesk(roomId, email, (onlineEntry[1] as any).name);
        io.to(roomId).emit("roomLayoutUpdated", layout);
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
      const layout = await getRoomLayout(roomId);
      const filtered = layout.filter(
        f => !(f.type === 'desk' && (f as DeskItem).config.ownerEmail === memberEmail)
      );
      if (filtered.length !== layout.length) {
        await saveRoomLayout(roomId, filtered);
        io.to(roomId).emit("roomLayoutUpdated", filtered);
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
      await pool.query('UPDATE rooms SET max_workers = $1 WHERE room_id = $2', [maxWorkers, roomId]);
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

    socket.on("joinRoom", async (data: { roomId: string }) => {
      const { roomId } = data;
      const room = roomId || "default";
      socket.join(room);

      if (!rooms[room]) {
        rooms[room] = {};
      }

      // Ensure user row exists and update display name
      await pool.query(
        `INSERT INTO users (email, display_name) VALUES ($1, $2)
         ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name`,
        [user.email, user.name]
      );

      // Ensure room exists; first joiner (or first joiner with no existing members) becomes admin
      await ensureRoom(room);
      const existingMembers = await getRoomMembers(room);
      if (existingMembers.length === 0) {
        await upsertMember(room, user.email, 'admin');
      }

      const role = await getMemberRole(room, user.email);
      const isMember = role !== null;

      // Initialize player using authenticated user info
      const name = user.name;
      rooms[room][socket.id] = {
        id: socket.id,
        email: user.email,
        position: [Math.random() * 5 - 2.5, 0, Math.random() * 5 - 2.5],
        rotation: [0, 0, 0],
        color: getDeterministicColor(name),
        name: name,
        room: room
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

      // Broadcast new player to others in the same room
      socket.to(room).emit("newPlayer", rooms[room][socket.id]);

      // Send persisted paper reams and avatar config to this player
      getPaperReams(user.email).then((count) => {
        socket.emit("paperReamsLoaded", count);
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
        ensurePlayerDesk(room, user.email, user.name).then((layout) => {
          socket.emit("roomLayoutLoaded", layout);
          socket.to(room).emit("roomLayoutUpdated", layout);
        }).catch((err) => {
          console.error("Error ensuring player desk:", err);
          socket.emit("roomLayoutLoaded", []);
        });
      } else {
        // Visitor: send current layout read-only, no desk created
        getRoomLayout(room).then((layout) => {
          socket.emit("roomLayoutLoaded", layout);
        });
      }

      // Send room info to joining socket
      try {
        const [members, roomRow] = await Promise.all([
          getRoomMembers(room),
          pool.query('SELECT max_workers FROM rooms WHERE room_id = $1', [room])
        ]);
        const onlineEmails = new Set(
          Object.values(rooms[room]).map((p: any) => p.email)
        );
        socket.emit("roomInfoLoaded", {
          roomId: room,
          maxWorkers: roomRow.rows[0]?.max_workers ?? 20,
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

    socket.on("playerFocusUpdate", (data: { isFocused: boolean; focusProgress: number; activeDeskId: string | null }) => {
      let playerRoom = "";
      for (const roomId in rooms) {
        if (rooms[roomId][socket.id]) {
          playerRoom = roomId;
          break;
        }
      }

      if (playerRoom && rooms[playerRoom][socket.id]) {
        rooms[playerRoom][socket.id].isFocused = data.isFocused;
        rooms[playerRoom][socket.id].focusProgress = data.focusProgress;
        rooms[playerRoom][socket.id].activeDeskId = data.activeDeskId;
        socket.to(playerRoom).emit("playerMoved", rooms[playerRoom][socket.id]);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
