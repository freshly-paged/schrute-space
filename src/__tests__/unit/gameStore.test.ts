import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameStore } from '../../store/useGameStore';

// useGameStore is a Zustand module-level singleton, so we must reset relevant
// slices before each test to prevent state leakage between tests.
// timerEndsAt, sessionPaperAccruedFloat, and lastFocusPaperTickAt are required
// by the wall-clock based tickTimer added in the main branch.
function resetStore() {
  useGameStore.setState({
    paperReams: 0,
    isTimerActive: false,
    isTimerPaused: false,
    timerMode: 'focus',
    timeLeft: 25 * 60, // 1500
    sessionPaper: 0,
    lastPaperEarnedAt: 0,
    nearestDeskId: null,
    activeDeskId: null,
    timerEndsAt: null,
    sessionPaperAccruedFloat: 0,
    lastFocusPaperTickAt: 0,
    focusEnergy: 100,
    monitorLevelByEmail: {},
    roomLayout: [],
    user: undefined,
  });
}

// ── Paper actions ──────────────────────────────────────────────────────────────

describe('useGameStore — paper actions', () => {
  beforeEach(resetStore);

  it('addPaper increments paperReams by the given amount', () => {
    useGameStore.getState().addPaper(5);
    expect(useGameStore.getState().paperReams).toBe(5);
  });

  it('addPaper is cumulative across multiple calls', () => {
    useGameStore.getState().addPaper(3);
    useGameStore.getState().addPaper(7);
    expect(useGameStore.getState().paperReams).toBe(10);
  });

  it('setPaperReams sets the value directly, overwriting current count', () => {
    useGameStore.getState().addPaper(10);
    useGameStore.getState().setPaperReams(42);
    expect(useGameStore.getState().paperReams).toBe(42);
  });
});

// ── Timer lifecycle ────────────────────────────────────────────────────────────

describe('useGameStore — timer lifecycle', () => {
  beforeEach(resetStore);

  it('startTimer(focus): sets isTimerActive=true, timeLeft=1500, sessionPaper=0', () => {
    useGameStore.getState().startTimer('focus');
    const s = useGameStore.getState();
    expect(s.isTimerActive).toBe(true);
    expect(s.isTimerPaused).toBe(false);
    expect(s.timerMode).toBe('focus');
    expect(s.timeLeft).toBe(1500);
    expect(s.sessionPaper).toBe(0);
    expect(s.lastPaperEarnedAt).toBe(0);
  });

  it('startTimer(break): sets timeLeft=300 (5 * 60)', () => {
    useGameStore.getState().startTimer('break');
    const s = useGameStore.getState();
    expect(s.timeLeft).toBe(300);
    expect(s.timerMode).toBe('break');
    expect(s.isTimerActive).toBe(true);
  });

  it('startTimer sets activeDeskId from nearestDeskId', () => {
    useGameStore.setState({ nearestDeskId: 'desk-pam' });
    useGameStore.getState().startTimer('focus');
    expect(useGameStore.getState().activeDeskId).toBe('desk-pam');
  });

  it('stopTimer: resets isTimerActive, isTimerPaused, activeDeskId, sessionPaper', () => {
    useGameStore.getState().startTimer('focus');
    useGameStore.getState().stopTimer();
    const s = useGameStore.getState();
    expect(s.isTimerActive).toBe(false);
    expect(s.isTimerPaused).toBe(false);
    expect(s.activeDeskId).toBeNull();
    expect(s.sessionPaper).toBe(0);
  });

  it('togglePause flips isTimerPaused from false to true', () => {
    useGameStore.getState().startTimer('focus');
    useGameStore.getState().togglePause();
    expect(useGameStore.getState().isTimerPaused).toBe(true);
  });

  it('togglePause flips isTimerPaused from true back to false', () => {
    useGameStore.getState().startTimer('focus');
    useGameStore.getState().togglePause();
    useGameStore.getState().togglePause();
    expect(useGameStore.getState().isTimerPaused).toBe(false);
  });
});

// ── tickTimer ─────────────────────────────────────────────────────────────────
//
// tickTimer is wall-clock based: timeLeft = ceil((timerEndsAt - Date.now()) / 1000).
// Paper accrual is dt-based: addFloat = (reamsPerMin / 60) * dtSec.
// Baseline: focusReamsPerMinute(0) = 2 reams/min, focusReamMultiplier(100) = 1.
// So: 2/60 reams/sec → 1 whole ream per 30 seconds (same threshold, different mechanism).
// Tests use vi.useFakeTimers() so Date.now() is fully controlled.

describe('useGameStore — tickTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetStore();
  });
  afterEach(() => vi.useRealTimers());

  it('does nothing when timer is not active', () => {
    useGameStore.getState().tickTimer();
    expect(useGameStore.getState().timeLeft).toBe(1500); // unchanged
    expect(useGameStore.getState().paperReams).toBe(0);
  });

  it('does nothing when timer is paused', () => {
    useGameStore.getState().startTimer('focus');
    useGameStore.getState().togglePause();
    vi.advanceTimersByTime(2000);
    useGameStore.getState().tickTimer();
    // timeLeft should still reflect the original 1500 since we're paused
    expect(useGameStore.getState().timeLeft).toBe(1500);
  });

  it('decrements timeLeft as wall clock advances', () => {
    useGameStore.getState().startTimer('focus');
    vi.advanceTimersByTime(1000); // advance 1 second
    useGameStore.getState().tickTimer();
    expect(useGameStore.getState().timeLeft).toBe(1499);
    vi.advanceTimersByTime(1000);
    useGameStore.getState().tickTimer();
    expect(useGameStore.getState().timeLeft).toBe(1498);
  });

  it('stops timer when the end time is reached', () => {
    useGameStore.getState().startTimer('focus');
    vi.advanceTimersByTime(25 * 60 * 1000 + 1000); // past full 25 minutes
    useGameStore.getState().tickTimer();
    expect(useGameStore.getState().isTimerActive).toBe(false);
    expect(useGameStore.getState().activeDeskId).toBeNull();
  });

  it('awards paper after 30 seconds of focus (baseline 2 reams/min)', () => {
    // 2 reams/min = 1 ream/30s. Advance 30s, call tickTimer to trigger accrual.
    useGameStore.getState().startTimer('focus');
    vi.advanceTimersByTime(30 * 1000); // 30 seconds
    useGameStore.getState().tickTimer();
    expect(useGameStore.getState().sessionPaper).toBe(1);
    expect(useGameStore.getState().paperReams).toBe(1);
  });

  it('awards 2 papers after 60 seconds of focus', () => {
    useGameStore.getState().startTimer('focus');
    vi.advanceTimersByTime(60 * 1000); // 60 seconds
    useGameStore.getState().tickTimer();
    expect(useGameStore.getState().sessionPaper).toBe(2);
    expect(useGameStore.getState().paperReams).toBe(2);
  });

  it('does NOT award paper during break mode', () => {
    useGameStore.getState().startTimer('break');
    vi.advanceTimersByTime(60 * 1000);
    useGameStore.getState().tickTimer();
    expect(useGameStore.getState().paperReams).toBe(0);
    expect(useGameStore.getState().sessionPaper).toBe(0);
  });

  it('updates lastPaperEarnedAt when paper is awarded', () => {
    useGameStore.getState().startTimer('focus');
    vi.advanceTimersByTime(30 * 1000);
    useGameStore.getState().tickTimer();
    expect(useGameStore.getState().lastPaperEarnedAt).toBeGreaterThan(0);
  });

  it('paper earned accumulates on top of existing paperReams', () => {
    useGameStore.setState({ paperReams: 100 });
    useGameStore.getState().startTimer('focus');
    vi.advanceTimersByTime(30 * 1000);
    useGameStore.getState().tickTimer();
    expect(useGameStore.getState().paperReams).toBe(101);
  });

  it('uses desk owner monitor level for paper while focusing (not sitter)', () => {
    useGameStore.setState({
      nearestDeskId: 'desk-alice',
      roomLayout: [
        {
          id: 'desk-alice',
          type: 'desk',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          config: { ownerEmail: 'alice@test', ownerName: 'Alice' },
        },
      ],
      monitorLevelByEmail: { 'alice@test': 3 },
      user: { email: 'bob@test', name: 'Bob' },
    });
    useGameStore.getState().startTimer('focus');
    vi.advanceTimersByTime(30 * 1000);
    useGameStore.getState().tickTimer();
    // Owner monitor L3 → 5 reams/min → 2.5 in 30s → 2 whole reams (sitter bob has no upgrades)
    expect(useGameStore.getState().sessionPaper).toBe(2);
    expect(useGameStore.getState().paperReams).toBe(2);
  });
});
