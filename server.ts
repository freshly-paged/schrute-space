import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import cookieParser from "cookie-parser";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
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

// ── Config ───────────────────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APP_URL = process.env.APP_URL;
const JWT_SECRET = process.env.SESSION_SECRET || "schrute-jwt-secret";

const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

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

  const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || "office-secret-key",
    resave: true,
    saveUninitialized: true,
    proxy: true,
    cookie: {
      secure: true,
      sameSite: "none",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  });

  app.use(cookieParser());
  app.use(sessionMiddleware);
  
  // JWT Authentication Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (!err) {
          req.user = user;
        }
        next();
      });
    } else if (req.session?.user) {
      req.user = req.session.user;
      next();
    } else {
      next();
    }
  };

  app.use(authenticateToken);
  io.engine.use(sessionMiddleware);

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;

  // Track active users by email to prevent multiple sessions
  const activeUsers = new Map<string, string>(); // email -> socketId

  // Auth Routes
  app.get("/api/auth/google/url", (req, res) => {
    const origin = (req.query.origin as string) || APP_URL;
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !origin) {
      console.error("OAuth configuration missing:", { GOOGLE_CLIENT_ID: !!GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET: !!GOOGLE_CLIENT_SECRET, origin: !!origin });
      return res.status(500).json({ error: "OAuth not configured" });
    }
    
    // Normalize origin: remove trailing slash
    const normalizedOrigin = origin.replace(/\/$/, "");
    const redirectUri = `${normalizedOrigin}/auth/google/callback`;
    
    // Use 'state' to pass the redirectUri back to ourselves
    const state = Buffer.from(JSON.stringify({ redirectUri })).toString('base64');

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
      state: state,
    }).toString()}`;
    res.json({ url });
  });

  app.get("/auth/google/callback", async (req, res) => {
    const { code, state } = req.query;
    if (!code || typeof code !== "string") return res.status(400).send("No code provided");

    try {
      let redirectUri = `${APP_URL?.replace(/\/$/, "")}/auth/google/callback`;
      
      if (state && typeof state === "string") {
        try {
          const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
          if (decodedState.redirectUri) {
            redirectUri = decodedState.redirectUri;
          }
        } catch (e) {
          console.error("Failed to parse state:", e);
        }
      }
      
      console.log("Exchanging code for tokens with redirectUri:", redirectUri);

      const { tokens } = await client.getToken({
        code,
        redirect_uri: redirectUri,
      });
      client.setCredentials(tokens);

      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();

      if (payload && payload.email) {
        const user = {
          email: payload.email,
          name: payload.name || payload.email.split("@")[0],
          picture: payload.picture,
        };
        
        (req.session as any).user = user;
        
        // Generate JWT
        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
        
        console.log("User authenticated:", payload.email);

        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            return res.status(500).send("Failed to save session");
          }
          
          res.send(`
            <html>
              <body>
                <script>
                  console.log("Auth success, setting storage signal");
                  localStorage.setItem('office_auth_token', '${token}');
                  localStorage.setItem('office_auth_success', Date.now().toString());
                  
                  if (window.opener) {
                    console.log("Sending message to opener");
                    window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: '${token}' }, '*');
                  }
                  
                  setTimeout(() => {
                    console.log("Closing popup");
                    window.close();
                  }, 500);
                </script>
                <div style="text-align: center; padding-top: 50px; font-family: sans-serif;">
                  <h2>Authentication Successful!</h2>
                  <p>This window will close automatically.</p>
                </div>
              </body>
            </html>
          `);
        });
      } else {
        res.status(400).send("Failed to get user info");
      }
    } catch (error) {
      console.error("OAuth Error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.get("/api/auth/debug", (req, res) => {
    res.json({
      hasSession: !!req.session,
      hasSessionUser: !!(req.session as any).user,
      hasReqUser: !!(req as any).user,
      user: (req as any).user || (req.session as any).user || null,
      cookie: req.headers.cookie || "no cookie header",
      authHeader: req.headers.authorization || "no auth header",
      sessionID: req.sessionID,
    });
  });

  app.get("/api/auth/me", (req, res) => {
    res.json((req as any).user || (req.session as any).user || null);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) console.error("Logout error:", err);
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
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
    const token = socket.handshake.auth?.token;
    let user = (socket.request as any).session?.user;

    if (token) {
      try {
        user = jwt.verify(token, JWT_SECRET);
        console.log("Socket authenticated via JWT:", user.email);
      } catch (e) {
        console.error("Socket JWT verification failed:", e);
      }
    } else if (user) {
      console.log("Socket authenticated via session:", user.email);
    }

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

      // Send persisted paper reams to this player
      getPaperReams(user.email).then((count) => {
        socket.emit("paperReamsLoaded", count);
      });
      
      console.log(`User ${socket.id} joined room: ${room}`);
    });

    socket.on("savePaperReams", (count: number) => {
      if (typeof count === 'number' && count >= 0) {
        savePaperReams(user.email, Math.floor(count));
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
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
