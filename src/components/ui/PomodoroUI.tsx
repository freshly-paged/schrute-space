import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Square } from 'lucide-react';
import { getEffectiveDeskUpgradeEmail } from '../../deskOwner';
import { focusReamMultiplier } from '../../focusEnergyModel';
import { focusReamsPerMinute } from '../../monitorUpgradeConstants';
import { TEAM_PYRAMID_FOCUS_REAM_MULTIPLIER } from '../../gameConfig';
import { useGameStore } from '../../store/useGameStore';
import { FocusEnergyBar } from './FocusEnergyBar';

export const PomodoroUI = () => {
  const isTimerActive = useGameStore((s) => s.isTimerActive);
  const isTimerPaused = useGameStore((s) => s.isTimerPaused);
  const timerMode = useGameStore((s) => s.timerMode);
  const timeLeft = useGameStore((s) => s.timeLeft);
  const tickTimer = useGameStore((s) => s.tickTimer);
  const stopTimer = useGameStore((s) => s.stopTimer);
  const togglePause = useGameStore((s) => s.togglePause);
  const nearestDeskId = useGameStore((s) => s.nearestDeskId);
  const activeDeskId = useGameStore((s) => s.activeDeskId);
  const roomLayout = useGameStore((s) => s.roomLayout);
  const sessionPaper = useGameStore((s) => s.sessionPaper);
  const user = useGameStore((s) => s.user);
  const monitorLevelByEmail = useGameStore((s) => s.monitorLevelByEmail);
  const focusEnergy = useGameStore((s) => s.focusEnergy);
  const teamPyramidBuffExpiresAt = useGameStore((s) => s.teamPyramidBuffExpiresAt);
  const focusSavingModeEnabled = useGameStore((s) => s.focusSavingModeEnabled);
  const toggleFocusSavingMode = useGameStore((s) => s.toggleFocusSavingMode);
  const upgradeEmail = getEffectiveDeskUpgradeEmail(
    roomLayout,
    activeDeskId,
    user?.email
  );
  const baseFocusPerMin =
    upgradeEmail !== undefined
      ? focusReamsPerMinute(monitorLevelByEmail[upgradeEmail] ?? 0)
      : focusReamsPerMinute(0);
  const teamPyramidActive =
    teamPyramidBuffExpiresAt != null &&
    Number.isFinite(teamPyramidBuffExpiresAt) &&
    Date.now() < teamPyramidBuffExpiresAt;
  let focusEarnPerMin =
    baseFocusPerMin * focusReamMultiplier(focusEnergy) * (teamPyramidActive ? TEAM_PYRAMID_FOCUS_REAM_MULTIPLIER : 1);
  focusEarnPerMin = Math.round(focusEarnPerMin * 10) / 10;

  useEffect(() => {
    if (!isTimerActive || isTimerPaused) return;

    const sync = () => tickTimer();
    const id = setInterval(sync, 1000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') sync();
    };
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(id);
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isTimerActive, isTimerPaused, tickTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isTimerActive && !nearestDeskId) return null;

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4">
      <AnimatePresence>
        {isTimerActive && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            drag
            dragMomentum={false}
            dragElastic={0}
            whileDrag={{ cursor: 'grabbing' }}
            className="pixel-panel font-pixel flex flex-col items-center min-w-[260px] p-0 overflow-hidden"
            style={{ cursor: 'grab' }}
          >
            {/* Time sheet header — drag handle */}
            <div
              className="w-full px-5 py-2 select-none"
              style={{ background: timerMode === 'focus' ? 'var(--color-schrute)' : '#166534' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white text-[8px] uppercase tracking-widest">
                    {timerMode === 'focus' ? 'TIME SHEET' : 'BREAK LOG'}
                  </div>
                  <div className="text-[7px] uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Dunder Mifflin Paper Co.
                  </div>
                </div>
                {/* Drag handle dots */}
                <div className="flex flex-col gap-[3px] opacity-60 pr-1">
                  {[0,1,2].map(r => (
                    <div key={r} className="flex gap-[3px]">
                      {[0,1].map(c => (
                        <div key={c} style={{ width: 3, height: 3, background: '#fff' }} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-full px-5 py-4 flex flex-col items-center gap-3">
              {/* Big timer */}
              <div className="text-5xl font-mono font-black tracking-tighter" style={{ color: 'var(--color-ink)' }}>
                {formatTime(timeLeft)}
              </div>

              {timerMode === 'focus' && (
                <div className="flex flex-col items-center gap-2 w-full max-w-[220px]">
                  <FocusEnergyBar focusEnergy={focusEnergy} className="w-full" showDecayHint />

                  <div
                    className="text-[8px] uppercase font-bold animate-pulse text-center"
                    style={{ color: isTimerPaused ? '#b45309' : 'var(--color-schrute)' }}
                  >
                    {isTimerPaused ? 'SESSION PAUSED' : 'STAY FOCUSED...'}
                  </div>

                  {teamPyramidActive && !isTimerPaused && (
                    <div className="flex flex-col items-center gap-0.5 text-center px-1">
                      <div className="text-[8px] uppercase font-bold" style={{ color: 'var(--color-beet)' }}>
                        Power of The Pyramid
                      </div>
                      <div className="text-[8px] leading-snug italic" style={{ color: 'var(--color-beet)' }}>
                        With the pyramid you have the connection to everything, in time, and space!
                      </div>
                    </div>
                  )}

                  <div className="font-mono text-[10px]" style={{ color: 'var(--color-ink-faint)' }}>
                    Earn rate:{' '}
                    <span style={{ color: 'var(--color-beet)' }}>{focusEarnPerMin} reams/min</span>
                    {isTimerPaused ? ' (paused)' : ''}
                  </div>

                  {sessionPaper > 0 && (
                    <div
                      className="flex items-center gap-1.5 px-3 py-1"
                      style={{
                        background: 'var(--color-legal)',
                        border: '2px solid var(--color-ink)',
                        color: 'var(--color-ink)',
                      }}
                    >
                      <span className="text-sm">📄</span>
                      <span className="text-[8px] font-bold">
                        +{sessionPaper} ream{sessionPaper !== 1 ? 's' : ''} this session
                      </span>
                    </div>
                  )}

                  {/* Saving mode row */}
                  <div
                    className="w-full px-3 py-2"
                    style={{ border: '2px solid var(--color-ink)', background: 'var(--color-paper-dark)' }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-left">
                        <div className="text-[8px] font-bold uppercase" style={{ color: 'var(--color-ink)' }}>
                          Saving Mode
                        </div>
                        <div className="text-[8px] leading-snug" style={{ color: 'var(--color-ink-faint)' }}>
                          Hide UI, reduce render cost.
                        </div>
                      </div>
                      <button
                        onClick={toggleFocusSavingMode}
                        className="pixel-button text-[8px] uppercase"
                        style={focusSavingModeEnabled
                          ? { background: '#166534', padding: '4px 10px' }
                          : { background: 'var(--color-ink)', padding: '4px 10px' }
                        }
                        title="Toggle Saving Mode"
                      >
                        {focusSavingModeEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={togglePause}
                  className="pixel-button flex-1 text-[8px] uppercase"
                  style={{ padding: '10px 12px', background: 'var(--color-ink)', color: '#fff', lineHeight: 1 }}
                >
                  {isTimerPaused ? '▶  RESUME' : '⏸  PAUSE'}
                </button>
                <button
                  onClick={stopTimer}
                  className="pixel-button text-[8px]"
                  style={{ padding: '10px 12px', background: 'var(--color-schrute)' }}
                  title="End Session"
                >
                  <Square className="w-3 h-3 fill-current" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
