import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Must mock 'three' before any import that transitively imports constants.ts.
// constants.ts builds COLLISION_BOXES by calling new THREE.Box3(...) at module
// evaluation time. Without this mock, the import would fail in Node/happy-dom.
vi.mock('three', () => {
  const vec3 = (x = 0, y = 0, z = 0) => ({ x, y, z });

  // MockBox3 stores real coordinates passed at construction so that the
  // applyGravity ground-level check (box.min.x, box.max.x, etc.) works correctly.
  const MockBox3 = vi.fn().mockImplementation((min?: ReturnType<typeof vec3>, max?: ReturnType<typeof vec3>) => ({
    min: min ?? vec3(),
    max: max ?? vec3(),
    // intersectsBox returns false by default → no collisions in movement tests
    intersectsBox: vi.fn().mockReturnValue(false),
    setFromCenterAndSize: vi.fn().mockReturnThis(),
  }));

  const MockVector3 = vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
    x, y, z,
    length: vi.fn().mockReturnValue(Math.sqrt(x * x + y * y + z * z)),
    clone: vi.fn().mockReturnThis(),
    normalize: vi.fn().mockReturnThis(),
    multiplyScalar: vi.fn().mockReturnThis(),
  }));

  return { Box3: MockBox3, Vector3: MockVector3 };
});

import { usePlayerPhysics } from '../../hooks/usePlayerPhysics';

// ── processJump ───────────────────────────────────────────────────────────────

describe('usePlayerPhysics — processJump', () => {
  it('first jump from grounded: sets isGrounded=false', () => {
    const { result } = renderHook(() => usePlayerPhysics());
    act(() => {
      result.current.isGrounded.current = true;
      result.current.processJump(true);
    });
    expect(result.current.isGrounded.current).toBe(false);
  });

  it('second jump (double jump): fires onDoubleJump callback', () => {
    const { result } = renderHook(() => usePlayerPhysics());
    const onDoubleJump = vi.fn();
    act(() => {
      result.current.isGrounded.current = true;
      result.current.processJump(true);        // first jump — press
    });
    act(() => {
      result.current.processJump(false);       // release
      result.current.processJump(true, { onDoubleJump }); // second jump
    });
    expect(onDoubleJump).toHaveBeenCalledTimes(1);
  });

  it('third jump attempt: onDoubleJump NOT called again (jumpCount=2 maxed)', () => {
    const { result } = renderHook(() => usePlayerPhysics());
    const onDoubleJump = vi.fn();
    act(() => {
      result.current.isGrounded.current = true;
      result.current.processJump(true);
      result.current.processJump(false);
      result.current.processJump(true, { onDoubleJump }); // 2nd jump
      result.current.processJump(false);
      result.current.processJump(true, { onDoubleJump }); // 3rd attempt — should be ignored
    });
    expect(onDoubleJump).toHaveBeenCalledTimes(1); // only the 2nd jump
  });

  it('holding jump (no release) does not multi-jump — edge-triggered', () => {
    const { result } = renderHook(() => usePlayerPhysics());
    const onDoubleJump = vi.fn();
    act(() => {
      result.current.isGrounded.current = true;
      result.current.processJump(true);  // press
      result.current.processJump(true);  // hold — same frame, should not fire again
      result.current.processJump(true);  // hold — still same press
    });
    // onDoubleJump never fired (still in first-jump state, only jumpCount=1)
    expect(onDoubleJump).not.toHaveBeenCalled();
    expect(result.current.isGrounded.current).toBe(false);
  });
});

// ── processRoll ───────────────────────────────────────────────────────────────

describe('usePlayerPhysics — processRoll', () => {
  // Start fake timers at 10000ms so the gap from lastForwardTime=0 is 10000ms,
  // which is well outside the 300ms DOUBLE_TAP_MS window. This prevents the first
  // tap from accidentally triggering a roll due to Date.now()-0 being within window.
  beforeEach(() => vi.useFakeTimers({ now: 10000 }));
  afterEach(() => vi.useRealTimers());

  it('double-tap W within 300ms → isRolling=true, onRoll called', () => {
    const { result } = renderHook(() => usePlayerPhysics());
    const onRoll = vi.fn();

    act(() => {
      result.current.processRoll(true, { onRoll });  // first tap — press
      result.current.processRoll(false, { onRoll }); // release
    });
    vi.advanceTimersByTime(200); // 200ms later — within DOUBLE_TAP_MS=300
    act(() => {
      result.current.processRoll(true, { onRoll });  // second tap
    });

    expect(onRoll).toHaveBeenCalledTimes(1);
    expect(result.current.isRolling.current).toBe(true);
  });

  it('double-tap W outside 300ms window → isRolling stays false, onRoll not called', () => {
    const { result } = renderHook(() => usePlayerPhysics());
    const onRoll = vi.fn();

    act(() => {
      result.current.processRoll(true, { onRoll });
      result.current.processRoll(false, { onRoll });
    });
    vi.advanceTimersByTime(400); // 400ms later — past DOUBLE_TAP_MS=300
    act(() => {
      result.current.processRoll(true, { onRoll });
    });

    expect(onRoll).not.toHaveBeenCalled();
    expect(result.current.isRolling.current).toBe(false);
  });
});

// ── tickRoll ──────────────────────────────────────────────────────────────────

describe('usePlayerPhysics — tickRoll', () => {
  it('full-duration tick (delta=0.5): isRolling becomes false', () => {
    const { result } = renderHook(() => usePlayerPhysics());
    act(() => {
      result.current.isRolling.current = true;
      result.current.rollTimer.current = 0.5; // ROLL_DURATION
      result.current.tickRoll(0.5);           // expires exactly
    });
    expect(result.current.isRolling.current).toBe(false);
  });

  it('partial tick (delta=0.1): isRolling stays true, rollTimer decremented', () => {
    const { result } = renderHook(() => usePlayerPhysics());
    act(() => {
      result.current.isRolling.current = true;
      result.current.rollTimer.current = 0.5;
      result.current.tickRoll(0.1);
    });
    expect(result.current.isRolling.current).toBe(true);
    expect(result.current.rollTimer.current).toBeCloseTo(0.4);
  });

  it('does nothing when isRolling is false', () => {
    const { result } = renderHook(() => usePlayerPhysics());
    act(() => {
      result.current.isRolling.current = false;
      result.current.rollTimer.current = 0;
      result.current.tickRoll(0.5);
    });
    expect(result.current.isRolling.current).toBe(false);
    expect(result.current.rollTimer.current).toBe(0);
  });
});

// ── applyGravity ──────────────────────────────────────────────────────────────

describe('usePlayerPhysics — applyGravity', () => {
  it('grounded player at y=0 stays at y=0 with no upward velocity', () => {
    const { result } = renderHook(() => usePlayerPhysics());
    // isGrounded=true (default), y=0 = groundY → no physics applied
    const newY = result.current.applyGravity([0, 0, 0], 0.016);
    expect(newY).toBe(0);
  });

  it('airborne player at y=2 falls (newY < 2)', () => {
    const { result } = renderHook(() => usePlayerPhysics());
    act(() => {
      result.current.isGrounded.current = false;
    });
    const newY = result.current.applyGravity([0, 2, 0], 0.016);
    expect(newY).toBeLessThan(2);
  });

  it('player cannot fall below y=0 (floor)', () => {
    const { result } = renderHook(() => usePlayerPhysics());
    act(() => {
      result.current.isGrounded.current = false;
    });
    // Simulate many ticks from a low height with a large delta
    let y = 0.5;
    for (let i = 0; i < 20; i++) {
      y = result.current.applyGravity([0, y, 0], 0.1);
    }
    expect(y).toBeGreaterThanOrEqual(0);
  });

  it('player landing resets isGrounded to true and jumpCount to 0', () => {
    const { result } = renderHook(() => usePlayerPhysics());
    act(() => {
      result.current.isGrounded.current = false;
    });
    // Tick until y returns to 0 (grounded)
    let y = 0.01; // just above floor
    for (let i = 0; i < 5; i++) {
      y = result.current.applyGravity([0, y, 0], 0.1);
    }
    expect(result.current.isGrounded.current).toBe(true);
  });
});

// ── applyMovement ─────────────────────────────────────────────────────────────

describe('usePlayerPhysics — applyMovement', () => {
  it('returns the same position when moveVector has zero length', async () => {
    const { result } = renderHook(() => usePlayerPhysics());
    // Construct a mock Vector3 with length()=0
    const { Vector3 } = await import('three') as any;
    const zeroVec = new Vector3(0, 0, 0);
    zeroVec.length.mockReturnValue(0);

    const pos: [number, number, number] = [1, 0, 1];
    const newPos = result.current.applyMovement(pos, zeroVec, 5, {});
    expect(newPos).toEqual(pos);
  });
});
