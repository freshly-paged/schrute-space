import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../../store/useGameStore';

// useGameStore is a Zustand module-level singleton, so we must reset relevant
// slices before each test to prevent state leakage between tests.
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

describe('useGameStore — tickTimer', () => {
  beforeEach(resetStore);

  it('does nothing when timer is not active', () => {
    useGameStore.getState().tickTimer();
    expect(useGameStore.getState().timeLeft).toBe(1500); // unchanged
    expect(useGameStore.getState().paperReams).toBe(0);
  });

  it('does nothing when timer is paused', () => {
    useGameStore.getState().startTimer('focus');
    useGameStore.getState().togglePause();
    const before = useGameStore.getState().timeLeft;
    useGameStore.getState().tickTimer();
    expect(useGameStore.getState().timeLeft).toBe(before);
  });

  it('decrements timeLeft by 1 each call', () => {
    useGameStore.getState().startTimer('focus');
    useGameStore.getState().tickTimer();
    expect(useGameStore.getState().timeLeft).toBe(1499);
    useGameStore.getState().tickTimer();
    expect(useGameStore.getState().timeLeft).toBe(1498);
  });

  it('stops timer when timeLeft is already 0 (called with timeLeft=0)', () => {
    // tickTimer guard: if (state.timeLeft <= 0) stop immediately
    useGameStore.setState({ isTimerActive: true, isTimerPaused: false, timerMode: 'focus', timeLeft: 0 });
    useGameStore.getState().tickTimer();
    expect(useGameStore.getState().isTimerActive).toBe(false);
    expect(useGameStore.getState().activeDeskId).toBeNull();
  });

  it('awards 1 paper at tick 30 (timeLeft drops to 1470)', () => {
    // Paper logic: (1500 - newTimeLeft) % 30 === 0 && newTimeLeft < 1500
    // At tick 30: newTimeLeft=1470, (1500-1470)=30, 30%30===0 → award
    useGameStore.getState().startTimer('focus');
    for (let i = 0; i < 30; i++) useGameStore.getState().tickTimer();
    expect(useGameStore.getState().sessionPaper).toBe(1);
    expect(useGameStore.getState().paperReams).toBe(1);
  });

  it('awards 2 papers total at tick 60 (timeLeft=1440)', () => {
    useGameStore.getState().startTimer('focus');
    for (let i = 0; i < 60; i++) useGameStore.getState().tickTimer();
    expect(useGameStore.getState().sessionPaper).toBe(2);
    expect(useGameStore.getState().paperReams).toBe(2);
  });

  it('does NOT award paper during break mode', () => {
    useGameStore.getState().startTimer('break');
    for (let i = 0; i < 30; i++) useGameStore.getState().tickTimer();
    expect(useGameStore.getState().paperReams).toBe(0);
    expect(useGameStore.getState().sessionPaper).toBe(0);
  });

  it('updates lastPaperEarnedAt when paper is awarded', () => {
    useGameStore.getState().startTimer('focus');
    for (let i = 0; i < 30; i++) useGameStore.getState().tickTimer();
    expect(useGameStore.getState().lastPaperEarnedAt).toBeGreaterThan(0);
  });

  it('paper earned accumulates on top of existing paperReams', () => {
    useGameStore.setState({ paperReams: 100 });
    useGameStore.getState().startTimer('focus');
    for (let i = 0; i < 30; i++) useGameStore.getState().tickTimer();
    expect(useGameStore.getState().paperReams).toBe(101);
  });
});
