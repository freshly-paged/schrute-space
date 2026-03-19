/**
 * Integration tests for server.ts
 *
 * STATUS: Skeleton — all tests are marked TODO pending a server refactor.
 *
 * BLOCKER (TODO #1): server.ts auto-executes on import (calls startServer() at
 * module evaluation time). To make it testable, refactor it to export a
 * createApp(pool?) factory function and guard the auto-start behind:
 *
 *   if (process.argv[1] === fileURLToPath(import.meta.url)) {
 *     createApp().then(({ httpServer }) => httpServer.listen(8080));
 *   }
 *
 * Once that's done, integration tests can:
 *   - Inject a mock pg.Pool to avoid needing a real database in unit mode
 *   - Spin up the real server with a test PostgreSQL database in CI
 *     (see .github/workflows/ci.yml — integration-tests job with postgres service)
 *
 * HOW TO UNBLOCK:
 *   1. Refactor server.ts as described above
 *   2. Replace the placeholder `expect(true).toBe(true)` assertions below with
 *      actual supertest / socket.io-client calls
 *   3. Uncomment the integration-tests job in ci.yml
 */

// import request from 'supertest';
// import { io as ioc } from 'socket.io-client';
// import { createApp } from '../../../server';

// Mock pg.Pool — swap for a real test DB when running integration-tests in CI
// vi.mock('pg', () => {
//   const mockQuery = vi.fn().mockResolvedValue({ rows: [] });
//   const MockPool = vi.fn().mockImplementation(() => ({ query: mockQuery }));
//   return { default: { Pool: MockPool }, Pool: MockPool };
// });

// Mock google-auth-library — Google OAuth requires real credentials and cannot
// be tested in CI without a live authorization code (TODO #4)
// vi.mock('google-auth-library', () => ({
//   OAuth2Client: vi.fn().mockImplementation(() => ({
//     getToken: vi.fn(),
//     setCredentials: vi.fn(),
//     verifyIdToken: vi.fn(),
//   })),
// }));

describe('REST API — GET /api/auth/me', () => {
  it.todo('returns null (not 401) when no auth token is provided', async () => {
    // const { app } = await createApp(mockPool);
    // const res = await request(app).get('/api/auth/me');
    // expect(res.status).toBe(200);
    // expect(res.body).toBeNull();
  });

  it.todo('returns the user object when a valid JWT is provided', async () => {
    // Sign a JWT with SESSION_SECRET, attach as Authorization: Bearer <token>
    // const res = await request(app)
    //   .get('/api/auth/me')
    //   .set('Authorization', `Bearer ${validJwt}`);
    // expect(res.status).toBe(200);
    // expect(res.body).toMatchObject({ email: 'test@example.com' });
  });
});

describe('REST API — POST /api/room-layout', () => {
  it.todo('returns 401 without a valid JWT', async () => {
    // const { app } = await createApp(mockPool);
    // const res = await request(app)
    //   .post('/api/room-layout')
    //   .send({ roomId: 'test-room', layout: [] });
    // expect(res.status).toBe(401);
  });

  it.todo('saves layout and broadcasts roomLayoutUpdated to room members', async () => {
    // Authenticate, then POST layout, then verify mockPool.query was called
    // and that connected socket clients received roomLayoutUpdated event
  });
});

describe('REST API — GET /api/player', () => {
  it.todo('returns 401 without auth', async () => {
    // const res = await request(app).get('/api/player');
    // expect(res.status).toBe(401);
  });

  it.todo('returns paperReams and avatarConfig for authenticated user', async () => {
    // mockPool.query resolves with { rows: [{ paper_reams: 5, avatar_config: null }] }
    // Verify res.body contains { paperReams: 5 }
  });
});

describe('Socket.IO — joinRoom', () => {
  it.todo('emits roomLayoutLoaded with the room layout on join', async () => {
    // const { httpServer } = await createApp(mockPool);
    // httpServer.listen(0); // random port
    // const port = (httpServer.address() as AddressInfo).port;
    // const client = ioc(`http://localhost:${port}`, { auth: { token: validJwt } });
    // await expect(new Promise(resolve => client.on('roomLayoutLoaded', resolve)))
    //   .resolves.toMatchObject({ layout: [] });
    // client.disconnect();
    // httpServer.close();
  });

  it.todo('single-session enforcement: second connect with same email disconnects first socket', async () => {
    // Connect client1 with email A, then connect client2 with same email A
    // Expect client1 to receive forceDisconnect and disconnect
  });
});

describe('Socket.IO — playerMovement', () => {
  it.todo('broadcasts playerMoved to other clients in same room', async () => {
    // Two clients join the same room
    // client1 emits playerMovement
    // Expect client2 receives playerMoved with client1's position
  });
});

describe('Socket.IO — chatMessage', () => {
  it.todo('broadcasts chatMessage to all clients in the room', async () => {
    // client1 sends chatMessage 'Hello'
    // client2 receives chatMessage event with text='Hello' and playerName
  });
});

describe('Socket.IO — ensurePlayerDesk', () => {
  it.todo('auto-creates a desk for a new player joining a room', async () => {
    // mockPool.query returns empty layout on first call (getRoomLayout)
    // After joinRoom, verify saveRoomLayout was called with a layout containing
    // a DeskItem whose config.ownerEmail matches the test user
  });

  it.todo('does not create duplicate desks if player already has one', async () => {
    // mockPool.query returns layout that already has a desk for the test email
    // After joinRoom, verify saveRoomLayout was NOT called again (no new desk added)
  });
});
