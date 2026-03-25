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
    CREATE TABLE IF NOT EXISTS room_layouts (
      room_id TEXT PRIMARY KEY,
      layout  JSONB NOT NULL DEFAULT '[]'
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
  const columns = [-11.5, -9.0, -6.5, -4.0, -1.5];
  const rows = [-16.5, -14.0, -11.5, -9.0, -6.5, -4.0, -2.5];
  for (const z of rows) {
    for (const x of columns) {
      const occupied = existingDesks.some((d) => {
        const dx = d.position[0] - x;
        const dz = d.position[2] - z;
        return Math.sqrt(dx * dx + dz * dz) < 2.5;
      });
      if (!occupied) return [x, 0, z];
    }
  }
  // Fallback: random position in the sales floor area
  return [Math.random() * 12 - 12, 0, Math.random() * 16 - 18];
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

    socket.on("joinRoom", (data: { roomId: string }) => {
      const { roomId } = data;
      const room = roomId || "default";
      socket.join(room);
      
      if (!rooms[room]) {
        rooms[room] = {};
      }

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
      // Ensure player has a desk and send the full room layout
      ensurePlayerDesk(room, user.email, user.name).then((layout) => {
        socket.emit("roomLayoutLoaded", layout);
        // Broadcast updated layout to others in the room
        socket.to(room).emit("roomLayoutUpdated", layout);
      }).catch((err) => {
        console.error("Error ensuring player desk:", err);
        socket.emit("roomLayoutLoaded", []);
      });
      
      console.log(`User ${socket.id} joined room: ${room}`);
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
    console.log(`Serving static files from: ${distPath}`);
    console.log(`dist/index.html exists: ${fs.existsSync(path.join(distPath, "index.html"))}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
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
