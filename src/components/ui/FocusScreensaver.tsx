import React, { useEffect } from 'react';
import { Square } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { FocusEnergyBar } from './FocusEnergyBar';
import { getEffectiveDeskUpgradeEmail } from '../../deskOwner';
import { focusReamMultiplier } from '../../focusEnergyModel';
import { focusReamsPerMinute } from '../../monitorUpgradeConstants';
import { TEAM_PYRAMID_FOCUS_REAM_MULTIPLIER } from '../../gameConfig';

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const FocusScreensaver = () => {
  const isTimerPaused      = useGameStore((s) => s.isTimerPaused);
  const timerMode          = useGameStore((s) => s.timerMode);
  const timeLeft           = useGameStore((s) => s.timeLeft);
  const stopTimer          = useGameStore((s) => s.stopTimer);
  const togglePause        = useGameStore((s) => s.togglePause);
  const activeDeskId       = useGameStore((s) => s.activeDeskId);
  const roomLayout         = useGameStore((s) => s.roomLayout);
  const sessionPaper       = useGameStore((s) => s.sessionPaper);
  const user               = useGameStore((s) => s.user);
  const monitorLevelByEmail = useGameStore((s) => s.monitorLevelByEmail);
  const focusEnergy        = useGameStore((s) => s.focusEnergy);
  const teamPyramidBuffExpiresAt = useGameStore((s) => s.teamPyramidBuffExpiresAt);
  const toggleFocusSavingMode = useGameStore((s) => s.toggleFocusSavingMode);
  const tickTimer              = useGameStore((s) => s.tickTimer);
  const isTimerActive          = useGameStore((s) => s.isTimerActive);

  // Drive the countdown (same logic as PomodoroUI, which is suppressed during saving mode)
  useEffect(() => {
    if (!isTimerActive || isTimerPaused) return;
    const sync = () => tickTimer();
    const id = setInterval(sync, 1000);
    const onVisibility = () => { if (document.visibilityState === 'visible') sync(); };
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isTimerActive, isTimerPaused, tickTimer]);

  const upgradeEmail = getEffectiveDeskUpgradeEmail(roomLayout, activeDeskId, user?.email);
  const baseFocusPerMin = upgradeEmail !== undefined
    ? focusReamsPerMinute(monitorLevelByEmail[upgradeEmail] ?? 0)
    : focusReamsPerMinute(0);
  const teamPyramidActive =
    teamPyramidBuffExpiresAt != null &&
    Number.isFinite(teamPyramidBuffExpiresAt) &&
    Date.now() < teamPyramidBuffExpiresAt;
  let focusEarnPerMin =
    baseFocusPerMin * focusReamMultiplier(focusEnergy) * (teamPyramidActive ? TEAM_PYRAMID_FOCUS_REAM_MULTIPLIER : 1);
  focusEarnPerMin = Math.round(focusEarnPerMin * 10) / 10;

  const isFocus = timerMode === 'focus';

  return (
    <div
      className="absolute inset-0 font-pixel overflow-hidden select-none"
      style={{ background: 'var(--color-paper)' }}
    >
      {/* Lined paper rows */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'repeating-linear-gradient(transparent, transparent 39px, #d4c9a8 39px, #d4c9a8 40px)',
        backgroundPositionY: '60px',
      }} />

      {/* Red margin line */}
      <div className="absolute top-0 bottom-0" style={{ left: 72, width: 2, background: '#e57373', opacity: 0.5 }} />

      {/* Memo header */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center px-10"
        style={{ background: 'var(--color-schrute)', height: 52 }}
      >
        <span className="text-white text-[9px] uppercase tracking-widest">DUNDER MIFFLIN PAPER CO.</span>
        <span className="ml-auto text-[7px] uppercase" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {isFocus ? 'Focus Session' : 'Break Session'}
        </span>
      </div>

      {/* Centred timesheet content */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: 52 }}>
        <div className="flex flex-col items-center gap-6" style={{ width: 340 }}>

          {/* Section label */}
          <div className="w-full">
            <div className="text-[7px] uppercase" style={{ color: 'var(--color-ink-faint)' }}>RE:</div>
            <div className="text-[8px] uppercase mt-1" style={{ color: 'var(--color-ink)' }}>
              {isFocus ? 'Active Focus Session' : 'Scheduled Break'}
            </div>
            <hr className="memo-rule mt-2" />
          </div>

          {/* Big timer */}
          <div
            className="font-mono font-black tracking-tighter"
            style={{ fontSize: 72, color: 'var(--color-ink)', lineHeight: 1 }}
          >
            {formatTime(timeLeft)}
          </div>

          {/* Status */}
          <div
            className="text-[8px] uppercase font-bold animate-pulse"
            style={{ color: isTimerPaused ? '#b45309' : 'var(--color-schrute)' }}
          >
            {isTimerPaused ? '— SESSION PAUSED —' : isFocus ? '— STAY FOCUSED —' : '— ENJOY YOUR BREAK —'}
          </div>

          {isFocus && (
            <>
              <div className="w-full">
                <FocusEnergyBar focusEnergy={focusEnergy} showDecayHint />
              </div>

              <div className="w-full flex justify-between text-[8px]">
                <span style={{ color: 'var(--color-ink-faint)' }}>EARN RATE</span>
                <span style={{ color: 'var(--color-beet)' }}>{focusEarnPerMin} reams/min</span>
              </div>

              {sessionPaper > 0 && (
                <div
                  className="flex items-center gap-2 px-4 py-2"
                  style={{
                    background: 'var(--color-legal)',
                    border: '2px solid var(--color-ink)',
                    color: 'var(--color-ink)',
                  }}
                >
                  <span className="text-sm">📄</span>
                  <span className="text-[8px] font-bold">
                    +{sessionPaper} ream{sessionPaper !== 1 ? 's' : ''} earned this session
                  </span>
                </div>
              )}

              {teamPyramidActive && (
                <div className="text-center">
                  <div className="text-[8px] font-bold uppercase" style={{ color: 'var(--color-beet)' }}>
                    ⬡ Power of The Pyramid Active
                  </div>
                </div>
              )}
            </>
          )}

          <hr className="memo-rule w-full" />

          {/* Action buttons */}
          <div className="flex gap-3 w-full">
            <button
              onClick={togglePause}
              className="pixel-button flex-1 text-[8px] uppercase"
              style={{ padding: '12px', background: 'var(--color-ink)', color: '#fff', lineHeight: 1 }}
            >
              {isTimerPaused ? '▶  RESUME' : '⏸  PAUSE'}
            </button>
            <button
              onClick={stopTimer}
              className="pixel-button text-[8px]"
              style={{ padding: '12px 16px', background: 'var(--color-schrute)' }}
              title="End Session"
            >
              <Square className="w-3 h-3 fill-current text-white" />
            </button>
          </div>

          {/* Exit saving mode */}
          <button
            onClick={toggleFocusSavingMode}
            className="text-[7px] uppercase"
            style={{ color: 'var(--color-ink-faint)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← exit saving mode
          </button>
        </div>
      </div>

      {/* Page footer */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
        <span className="text-[7px] uppercase" style={{ color: 'var(--color-ink-faint)' }}>
          DUNDER MIFFLIN · INTERNAL USE ONLY · PAGE 1 OF 1
        </span>
      </div>
    </div>
  );
};
