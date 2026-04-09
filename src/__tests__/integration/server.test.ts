/**
 * Integration tests for server.ts REST API + Socket.IO
 *
 * Strategy: inject a mock pg.Pool into createApp() so no real database is
 * needed. The mock pool records every query call and returns pre-configured
 * rows. Auth is handled via the DEV_USER_EMAIL env variable (no IAP header
 * needed) — server.ts falls back to it automatically.
 *
 * Socket.IO tests spin up the httpServer on a random port (listen(0)) and
 * connect a real socket.io-client so that the full event pipeline is exercised.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { io as ioc, type Socket } from 'socket.io-client';
import type { AddressInfo } from 'net';
import type pg from 'pg';
import { TEAM_PYRAMID_DURATION_MS } from '../../gameConfig.js';

// Static import so that dotenv.config() in server.ts runs exactly once (at
// file load time), before any test manipulates process.env. Dynamic
// await import() inside tests would re-trigger dotenv on the first call.
import { createApp } from '../../../server.js';

// ── Mock pool factory ─────────────────────────────────────────────────────────
//
// makePool() returns a fake pg.Pool whose .query() resolves with the rows
// registered via the chainable .on(sqlFragment, rows) helper.  Unrecognised
// queries resolve with { rows: [], rowCount: 0 } so every DB call succeeds
// without throwing.

type QueryResult = { rows: any[]; rowCount?: number };

function makePool(defaults: Array<{ match: string; result: QueryResult }> = []) {
  const handlers = [...defaults];

  const query = vi.fn(async (sql: string, _params?: any[]): Promise<QueryResult> => {
    for (const h of handlers) {
      if (sql.includes(h.match)) return h.result;
    }
    return { rows: [], rowCount: 0 };
  });

  return { query } as unknown as pg.Pool;
}

// ── Auth helper ───────────────────────────────────────────────────────────────
// server.ts falls back to process.env.DEV_USER_EMAIL when the IAP header is
// absent, so we set/clear it around each test suite.

const TEST_EMAIL = 'test@example.com';
const TEST_NAME = 'Test'; // derived from email: test@example.com → "Test"

// ── REST API ─────────────────────────────────────────────────────────────────

describe('REST API — GET /api/auth/me', () => {
  it('returns the dev@local.test fallback in non-production dev mode (no IAP, no DEV_USER_EMAIL)', async () => {
    // In test mode (NODE_ENV=test, not production), getIAPUser falls back to
    // { email: "dev@local.test" } when no IAP header or DEV_USER_EMAIL is set.
    vi.stubEnv('DEV_USER_EMAIL', '');
    const { app } = await createApp(makePool());
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: 'dev@local.test' });
    vi.unstubAllEnvs();
  });

  it('returns the user object when DEV_USER_EMAIL is set', async () => {
    process.env.DEV_USER_EMAIL = TEST_EMAIL;
    const { app } = await createApp(makePool());
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: TEST_EMAIL });
  });

  it('returns the user from X-Goog-Authenticated-User-Email header (IAP takes priority)', async () => {
    const iapEmail = 'iap-user@example.com';
    const { app } = await createApp(makePool());
    const res = await request(app)
      .get('/api/auth/me')
      .set('x-goog-authenticated-user-email', `accounts.google.com:${iapEmail}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: iapEmail });
  });
});

describe('REST API — GET /api/player', () => {
  beforeEach(() => { process.env.DEV_USER_EMAIL = TEST_EMAIL; });
  afterEach(() => { delete process.env.DEV_USER_EMAIL; });

  it('returns player data for the dev@local.test fallback user when no DEV_USER_EMAIL is set', async () => {
    // In non-production mode getIAPUser always returns at least dev@local.test.
    vi.stubEnv('DEV_USER_EMAIL', '');
    const pool = makePool([
      { match: 'SELECT paper_reams', result: { rows: [{ paper_reams: 0 }] } },
      { match: 'SELECT avatar_config', result: { rows: [] } },
    ]);
    const { app } = await createApp(pool);
    const res = await request(app).get('/api/player');
    expect(res.status).toBe(200);
    vi.unstubAllEnvs();
  });

  it('returns paperReams and avatarConfig for authenticated user', async () => {
    const pool = makePool([
      { match: 'SELECT paper_reams', result: { rows: [{ paper_reams: 42 }], rowCount: 1 } },
      { match: 'SELECT avatar_config', result: { rows: [{ avatar_config: { shirtColor: '#ff0000', skinTone: '#ffcc99', pantColor: '#0000ff' } }], rowCount: 1 } },
    ]);

    const { app } = await createApp(pool);

    const res = await request(app).get('/api/player');
    expect(res.status).toBe(200);
    expect(res.body.paperReams).toBe(42);
    expect(res.body.avatarConfig).toMatchObject({ shirtColor: '#ff0000' });
  });

  it('returns avatarConfig=null when avatar_config is empty object', async () => {
    const pool = makePool([
      { match: 'SELECT paper_reams', result: { rows: [{ paper_reams: 0 }] } },
      { match: 'SELECT avatar_config', result: { rows: [{ avatar_config: {} }] } },
    ]);

    const { app } = await createApp(pool);

    const res = await request(app).get('/api/player');
    expect(res.status).toBe(200);
    expect(res.body.avatarConfig).toBeNull();
  });
});

describe('REST API — POST /api/room-layout', () => {
  beforeEach(() => { process.env.DEV_USER_EMAIL = TEST_EMAIL; });
  afterEach(() => { delete process.env.DEV_USER_EMAIL; });

  it('returns 400 when layout field is not an array', async () => {
    process.env.DEV_USER_EMAIL = TEST_EMAIL;
    const { app } = await createApp(makePool());
    const res = await request(app).post('/api/room-layout').send({ roomId: 'test-room', layout: 'bad' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when roomId is missing', async () => {
    const { app } = await createApp(makePool());

    const res = await request(app)
      .post('/api/room-layout')
      .send({ layout: [] });
    expect(res.status).toBe(400);
  });

  it('saves layout and returns ok:true', async () => {
    const pool = makePool();

    const { app } = await createApp(pool);

    const layout = [{ id: 'desk-1', type: 'desk', position: [0, 0, 0], rotation: [0, 0, 0], config: {} }];
    const res = await request(app)
      .post('/api/room-layout')
      .send({ roomId: 'test-room', layout });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    // Verify the pool was queried to persist the layout
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO room_layouts'),
      expect.arrayContaining(['test-room'])
    );
  });
});

describe('REST API — POST /api/avatar', () => {
  beforeEach(() => { process.env.DEV_USER_EMAIL = TEST_EMAIL; });
  afterEach(() => { delete process.env.DEV_USER_EMAIL; });

  it('returns 400 when avatar fields are missing', async () => {
    const { app } = await createApp(makePool());

    const res = await request(app)
      .post('/api/avatar')
      .send({ shirtColor: '#ff0000' }); // missing skinTone + pantColor
    expect(res.status).toBe(400);
  });

  it('saves avatar config and returns ok:true', async () => {
    const pool = makePool();
    const { app } = await createApp(pool);

    const res = await request(app)
      .post('/api/avatar')
      .send({ shirtColor: '#ff0000', skinTone: '#ffcc99', pantColor: '#0000ff' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO users'),
      expect.arrayContaining([TEST_EMAIL])
    );
  });
});

describe('REST API — GET /api/room/:roomId/leaderboard', () => {
  beforeEach(() => { process.env.DEV_USER_EMAIL = TEST_EMAIL; });
  afterEach(() => { delete process.env.DEV_USER_EMAIL; });

  it('returns empty array when room has no members', async () => {
    // The leaderboard query returns empty rows when no members exist.
    process.env.DEV_USER_EMAIL = TEST_EMAIL;
    const { app } = await createApp(makePool());
    const res = await request(app).get('/api/room/empty-room/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns leaderboard rows', async () => {
    const pool = makePool([
      {
        match: 'COALESCE(u.total_paper_reams_earned',
        result: {
          rows: [
            { email: 'a@test.com', name: 'Alice', jobTitle: null, role: 'admin', totalReamsEarned: 100 },
            { email: 'b@test.com', name: 'Bob', jobTitle: null, role: 'worker', totalReamsEarned: 50 },
          ]
        }
      }
    ]);

    const { app } = await createApp(pool);

    const res = await request(app).get('/api/room/my-room/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({ email: 'a@test.com', totalReamsEarned: 100 });
  });
});

// ── Socket.IO ─────────────────────────────────────────────────────────────────
//
// Each test spins up the server on a random port, connects clients, runs the
// scenario, then tears down. A generous timeout is set per test to accommodate
// async socket handshake + DB round-trips.

/**
 * Wait for a socket event and return its payload, or reject after `timeout` ms.
 */
function waitFor<T = unknown>(socket: Socket, event: string, timeout = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for "${event}"`)), timeout);
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

function emitWithAck<T = unknown>(
  socket: Socket,
  event: string,
  timeout = 3000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for ack from "${event}"`)),
      timeout
    );
    socket.emit(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

/**
 * Returns a pool whose query responses are tailored to a successful joinRoom
 * flow: ensureRoom (insert), getRoomMembers (empty → caller becomes admin),
 * upsertMember (admin), getMemberRole (returns 'admin'), getRoomLayout (empty),
 * saveRoomLayout (noop), getPaperReams (0), getAvatarConfig (null),
 * SELECT max_workers (20).
 */
function makeJoinRoomPool() {
  return makePool([
    // INSERT INTO users ... ON CONFLICT ...
    { match: 'INSERT INTO users (email, display_name)', result: { rows: [], rowCount: 1 } },
    // ensureRoom: INSERT INTO rooms
    { match: 'INSERT INTO rooms', result: { rows: [], rowCount: 0 } },
    // getRoomMembers: returns empty so first joiner becomes admin
    { match: 'FROM room_members rm', result: { rows: [], rowCount: 0 } },
    // upsertMember
    { match: 'INSERT INTO room_members', result: { rows: [], rowCount: 1 } },
    // getMemberRole
    { match: 'SELECT role FROM room_members', result: { rows: [{ role: 'admin' }], rowCount: 1 } },
    // getRoomLayout
    { match: 'SELECT layout FROM room_layouts', result: { rows: [], rowCount: 0 } },
    // saveRoomLayout (ensurePlayerDesk)
    { match: 'INSERT INTO room_layouts', result: { rows: [], rowCount: 1 } },
    // getPaperReams
    { match: 'SELECT paper_reams', result: { rows: [{ paper_reams: 0 }], rowCount: 1 } },
    // getAvatarConfig
    { match: 'SELECT avatar_config', result: { rows: [], rowCount: 0 } },
    // SELECT max_workers
    { match: 'SELECT max_workers', result: { rows: [{ max_workers: 20 }], rowCount: 1 } },
  ]);
}

describe('Socket.IO — joinRoom', () => {
  let httpServer: any;
  let client: Socket;
  let port: number;

  beforeEach(async () => {
    process.env.DEV_USER_EMAIL = TEST_EMAIL;
    ({ httpServer } = await createApp(makeJoinRoomPool()));
    await new Promise<void>(resolve => httpServer.listen(0, resolve));
    port = (httpServer.address() as AddressInfo).port;
  });

  afterEach(async () => {
    delete process.env.DEV_USER_EMAIL;
    client?.disconnect();
    await new Promise<void>(resolve => httpServer.close(() => resolve()));
  });

  it('emits roomLayoutLoaded after joinRoom', async () => {
    client = ioc(`http://localhost:${port}`, { reconnection: false });
    const layoutPromise = waitFor<any[]>(client, 'roomLayoutLoaded');
    client.emit('joinRoom', { roomId: 'test-room' });
    const layout = await layoutPromise;
    // Layout may contain the auto-created desk for the admin
    expect(Array.isArray(layout)).toBe(true);
  });

  it('emits currentPlayers after joinRoom with the joining player included', async () => {
    client = ioc(`http://localhost:${port}`, { reconnection: false });
    const playersPromise = waitFor<Record<string, any>>(client, 'currentPlayers');
    client.emit('joinRoom', { roomId: 'test-room' });
    const players = await playersPromise;
    const playerList = Object.values(players);
    expect(playerList.length).toBeGreaterThan(0);
    expect(playerList[0]).toMatchObject({ email: TEST_EMAIL, name: TEST_NAME });
  });

  it('emits roomInfoLoaded with role=admin for the first joiner', async () => {
    client = ioc(`http://localhost:${port}`, { reconnection: false });
    const infoPromise = waitFor<any>(client, 'roomInfoLoaded');
    client.emit('joinRoom', { roomId: 'test-room' });
    const info = await infoPromise;
    expect(info).toMatchObject({ roomId: 'test-room', myRole: 'admin' });
  });

  it('single-session: second connection with same email gets forceDisconnect on first', async () => {
    // Connect first client
    const client1 = ioc(`http://localhost:${port}`, { reconnection: false });
    await waitFor(client1, 'connect');
    client1.emit('joinRoom', { roomId: 'test-room' });
    await waitFor(client1, 'currentPlayers');

    // Connect second client (same email via DEV_USER_EMAIL)
    const forceDisconnectPromise = waitFor(client1, 'forceDisconnect');
    const client2 = ioc(`http://localhost:${port}`, { reconnection: false });
    client2.emit('joinRoom', { roomId: 'test-room' });

    await forceDisconnectPromise;
    client = client2; // afterEach will clean up client2
    client1.disconnect();
  });
});

describe('Socket.IO — playerMovement', () => {
  let httpServer: any;
  let client1: Socket;
  let client2: Socket;
  let port: number;

  beforeEach(async () => {
    process.env.DEV_USER_EMAIL = TEST_EMAIL;
    ({ httpServer } = await createApp(makeJoinRoomPool()));
    await new Promise<void>(resolve => httpServer.listen(0, resolve));
    port = (httpServer.address() as AddressInfo).port;
  });

  afterEach(async () => {
    delete process.env.DEV_USER_EMAIL;
    client1?.disconnect();
    client2?.disconnect();
    await new Promise<void>(resolve => httpServer.close(() => resolve()));
  });

  it('broadcasts playerMoved to other clients in the same room', async () => {
    // Both clients share DEV_USER_EMAIL — but single-session kicks in,
    // so we simulate two different users via the IAP header on client2.
    // For simplicity, use two sequential connections and override auth for client2.
    const OTHER_EMAIL = 'other@example.com';

    client1 = ioc(`http://localhost:${port}`, { reconnection: false });
    await waitFor(client1, 'connect');
    client1.emit('joinRoom', { roomId: 'test-room' });
    await waitFor(client1, 'currentPlayers');

    // Switch DEV_USER_EMAIL so the second connection is a different user
    process.env.DEV_USER_EMAIL = OTHER_EMAIL;
    client2 = ioc(`http://localhost:${port}`, { reconnection: false });
    await waitFor(client2, 'connect');

    const playerMovedPromise = waitFor<any>(client1, 'playerMoved');
    client2.emit('joinRoom', { roomId: 'test-room' });
    await waitFor(client2, 'currentPlayers');

    const newPosition = [1, 0, 2];
    client2.emit('playerMovement', { position: newPosition, rotation: [0, 0, 0], isRolling: false, rollTimer: 0 });

    const moved = await playerMovedPromise;
    expect(moved.position).toEqual(newPosition);
    expect(moved.email).toBe(OTHER_EMAIL);
  });
});

describe('Socket.IO — chatMessage', () => {
  let httpServer: any;
  let client1: Socket;
  let client2: Socket;
  let port: number;

  beforeEach(async () => {
    process.env.DEV_USER_EMAIL = TEST_EMAIL;
    ({ httpServer } = await createApp(makeJoinRoomPool()));
    await new Promise<void>(resolve => httpServer.listen(0, resolve));
    port = (httpServer.address() as AddressInfo).port;
  });

  afterEach(async () => {
    delete process.env.DEV_USER_EMAIL;
    client1?.disconnect();
    client2?.disconnect();
    await new Promise<void>(resolve => httpServer.close(() => resolve()));
  });

  it('broadcasts chatMessage to all clients in the room', async () => {
    const OTHER_EMAIL = 'chatter@example.com';

    client1 = ioc(`http://localhost:${port}`, { reconnection: false });
    await waitFor(client1, 'connect');
    client1.emit('joinRoom', { roomId: 'chat-room' });
    await waitFor(client1, 'currentPlayers');

    process.env.DEV_USER_EMAIL = OTHER_EMAIL;
    client2 = ioc(`http://localhost:${port}`, { reconnection: false });
    await waitFor(client2, 'connect');
    client2.emit('joinRoom', { roomId: 'chat-room' });
    await waitFor(client2, 'currentPlayers');

    const chatPromise = waitFor<any>(client1, 'chatMessage');
    client2.emit('chatMessage', 'Bears. Beets. Battlestar Galactica.');

    const msg = await chatPromise;
    expect(msg.text).toBe('Bears. Beets. Battlestar Galactica.');
    expect(msg.playerName).toBeTruthy();
    expect(msg.id).toBeTruthy();
    expect(typeof msg.time).toBe('number');
  });
});

describe('Socket.IO — playerFocusUpdate identity-theft system chat', () => {
  let httpServer: any;
  let owner: Socket;
  let intruder: Socket;
  let port: number;
  const roomId = 'identity-theft-room';
  const ownerEmail = 'desk-owner@example.com';
  const intruderEmail = 'desk-intruder@example.com';
  const expectedText =
    'Identity theft is not a joke! https://www.youtube.com/watch?v=WaaANll8h18';
  const expectedOverheadText = 'Identity theft is not a joke!';
  const expectedOverheadDurationMs = 10_000;

  const connectAs = (email: string) =>
    ioc(`http://localhost:${port}`, {
      reconnection: false,
      extraHeaders: {
        'x-goog-authenticated-user-email': `accounts.google.com:${email}`,
      },
    });

  beforeEach(async () => {
    vi.stubEnv('LOCAL_TEST', '1');
    delete process.env.DEV_USER_EMAIL;
    ({ httpServer } = await createApp());
    await new Promise<void>(resolve => httpServer.listen(0, resolve));
    port = (httpServer.address() as AddressInfo).port;
  });

  afterEach(async () => {
    owner?.disconnect();
    intruder?.disconnect();
    await new Promise<void>(resolve => httpServer.close(() => resolve()));
    vi.unstubAllEnvs();
    delete process.env.DEV_USER_EMAIL;
  });

  it('broadcasts a system warning when a player focuses at another player desk', async () => {
    owner = connectAs(ownerEmail);
    await waitFor(owner, 'connect');
    const ownerLayoutPromise = waitFor<any[]>(owner, 'roomLayoutLoaded');
    owner.emit('joinRoom', { roomId });
    await waitFor(owner, 'currentPlayers');
    await ownerLayoutPromise;

    intruder = connectAs(intruderEmail);
    await waitFor(intruder, 'connect');
    const intruderLayoutPromise = waitFor<any[]>(intruder, 'roomLayoutLoaded');
    intruder.emit('joinRoom', { roomId });
    await waitFor(intruder, 'currentPlayers');
    const intruderLayout = await intruderLayoutPromise;

    const ownerDesk = intruderLayout.find(
      (f: any) => f.type === 'desk' && f.config?.ownerEmail === ownerEmail
    );
    expect(ownerDesk).toBeDefined();

    const ownerMessagePromise = waitFor<any>(owner, 'chatMessage');
    const intruderMessagePromise = waitFor<any>(intruder, 'chatMessage');
    const ownerOverheadPromise = waitFor<any>(owner, 'ambientSpeech');
    const intruderOverheadPromise = waitFor<any>(intruder, 'ambientSpeech');
    intruder.emit('playerFocusUpdate', {
      isFocused: true,
      focusProgress: 0.1,
      activeDeskId: ownerDesk.id,
      focusSitPoseIndex: 0,
    });

    const [ownerMsg, intruderMsg, ownerOverhead, intruderOverhead] = await Promise.all([
      ownerMessagePromise,
      intruderMessagePromise,
      ownerOverheadPromise,
      intruderOverheadPromise,
    ]);
    expect(ownerMsg).toMatchObject({
      playerId: 'system',
      playerName: 'System',
      text: expectedText,
    });
    expect(intruderMsg).toMatchObject({
      playerId: 'system',
      playerName: 'System',
      text: expectedText,
    });
    expect(ownerOverhead).toMatchObject({
      playerId: intruder.id,
      text: expectedOverheadText,
      durationMs: expectedOverheadDurationMs,
    });
    expect(intruderOverhead).toMatchObject({
      playerId: intruder.id,
      text: expectedOverheadText,
      durationMs: expectedOverheadDurationMs,
    });
    expect(typeof ownerOverhead.time).toBe('number');
    expect(typeof intruderOverhead.time).toBe('number');
  });
});

describe('Socket.IO — purchaseTeamPyramid', () => {
  let httpServer: any;
  let buyer: Socket;
  let watcher: Socket;
  let port: number;

  const roomId = 'pyramid-room';
  const buyerEmail = 'pyramid-buyer@example.com';
  const watcherEmail = 'pyramid-watcher@example.com';

  const connectAs = (email: string) =>
    ioc(`http://localhost:${port}`, {
      reconnection: false,
      extraHeaders: {
        'x-goog-authenticated-user-email': `accounts.google.com:${email}`,
      },
    });

  beforeEach(async () => {
    vi.stubEnv('LOCAL_TEST', '1');
    delete process.env.DEV_USER_EMAIL;
    ({ httpServer } = await createApp());
    await new Promise<void>(resolve => httpServer.listen(0, resolve));
    port = (httpServer.address() as AddressInfo).port;
  });

  afterEach(async () => {
    buyer?.disconnect();
    watcher?.disconnect();
    await new Promise<void>(resolve => httpServer.close(() => resolve()));
    vi.unstubAllEnvs();
    delete process.env.DEV_USER_EMAIL;
  });

  it('extends an already-active Team Pyramid buff by another full duration', async () => {
    buyer = connectAs(buyerEmail);
    await waitFor(buyer, 'connect');
    buyer.emit('joinRoom', { roomId });
    await waitFor(buyer, 'currentPlayers');

    const first = await emitWithAck<{ ok: boolean; expiresAt?: number }>(buyer, 'purchaseTeamPyramid');
    const second = await emitWithAck<{ ok: boolean; expiresAt?: number }>(buyer, 'purchaseTeamPyramid');

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(typeof first.expiresAt).toBe('number');
    expect(typeof second.expiresAt).toBe('number');
    expect((second.expiresAt as number) - (first.expiresAt as number)).toBe(TEAM_PYRAMID_DURATION_MS);
  });

  it('broadcasts the pyramid system message to chat for everyone in the room', async () => {
    buyer = connectAs(buyerEmail);
    await waitFor(buyer, 'connect');
    buyer.emit('joinRoom', { roomId });
    await waitFor(buyer, 'currentPlayers');

    watcher = connectAs(watcherEmail);
    await waitFor(watcher, 'connect');
    watcher.emit('joinRoom', { roomId });
    await waitFor(watcher, 'currentPlayers');

    const buyerMessagePromise = waitFor<any>(buyer, 'chatMessage');
    const watcherMessagePromise = waitFor<any>(watcher, 'chatMessage');
    const purchase = await emitWithAck<{ ok: boolean }>(buyer, 'purchaseTeamPyramid');

    expect(purchase.ok).toBe(true);
    const [buyerMsg, watcherMsg] = await Promise.all([buyerMessagePromise, watcherMessagePromise]);
    expect(buyerMsg).toMatchObject({
      playerId: 'system',
      playerName: 'System',
      text: 'Unleash the power of Pyramid!',
    });
    expect(watcherMsg).toMatchObject({
      playerId: 'system',
      playerName: 'System',
      text: 'Unleash the power of Pyramid!',
    });
  });
});

describe('Socket.IO — ensurePlayerDesk', () => {
  let httpServer: any;
  let client: Socket;
  let port: number;
  let pool: pg.Pool;

  beforeEach(async () => {
    process.env.DEV_USER_EMAIL = TEST_EMAIL;
    pool = makeJoinRoomPool();
    ({ httpServer } = await createApp(pool));
    await new Promise<void>(resolve => httpServer.listen(0, resolve));
    port = (httpServer.address() as AddressInfo).port;
  });

  afterEach(async () => {
    delete process.env.DEV_USER_EMAIL;
    client?.disconnect();
    await new Promise<void>(resolve => httpServer.close(() => resolve()));
  });

  it('auto-creates a desk for the first joiner (admin)', async () => {
    client = ioc(`http://localhost:${port}`, { reconnection: false });
    const layoutPromise = waitFor<any[]>(client, 'roomLayoutLoaded');
    client.emit('joinRoom', { roomId: 'desk-room' });
    const layout = await layoutPromise;

    // The admin joining an empty room triggers ensurePlayerDesk which creates a desk
    const desk = layout.find((f: any) => f.type === 'desk' && f.config?.ownerEmail === TEST_EMAIL);
    expect(desk).toBeDefined();
    expect(desk.id).toBe(`desk-${TEST_EMAIL}`);
  });
});
