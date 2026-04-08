import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Coffee, Play, Square, Pause } from 'lucide-react';
import { getEffectiveDeskUpgradeEmail } from '../../deskOwner';
import { focusReamMultiplier } from '../../focusEnergyModel';
import { focusReamsPerMinute } from '../../monitorUpgradeConstants';
import { useGameStore } from '../../store/useGameStore';
import { FocusEnergyBar } from './FocusEnergyBar';

export const PomodoroUI = () => {
  const {
    isTimerActive,
    isTimerPaused,
    timerMode,
    timeLeft,
    tickTimer,
    stopTimer,
    togglePause,
    nearestDeskId,
    activeDeskId,
    roomLayout,
    sessionPaper,
    user,
    monitorLevelByEmail,
    focusEnergy,
  } = useGameStore();
  const upgradeEmail = getEffectiveDeskUpgradeEmail(
    roomLayout,
    activeDeskId,
    user?.email
  );
  const baseFocusPerMin =
    upgradeEmail !== undefined
      ? focusReamsPerMinute(monitorLevelByEmail[upgradeEmail] ?? 0)
      : focusReamsPerMinute(0);
  const focusEarnPerMin =
    Math.round(baseFocusPerMin * focusReamMultiplier(focusEnergy) * 10) / 10;

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
            className="bg-slate-900/80 backdrop-blur-xl border-2 border-indigo-500 p-6 rounded-3xl shadow-2xl flex flex-col items-center min-w-[240px]"
          >
            <div className="flex items-center gap-3 mb-2">
              {timerMode === 'focus' ? (
                <Timer className="text-red-400 w-5 h-5 animate-pulse" />
              ) : (
                <Coffee className="text-emerald-400 w-5 h-5 animate-bounce" />
              )}
              <span className="text-white font-bold uppercase tracking-widest text-sm">
                {timerMode === 'focus' ? 'Focus Session' : 'Break Time'}
              </span>
            </div>

            <div className="text-5xl font-mono text-white font-black mb-6 tracking-tighter">
              {formatTime(timeLeft)}
            </div>

            {timerMode === 'focus' && (
              <div className="flex flex-col items-center gap-1 mb-6 w-full max-w-[220px]">
                <FocusEnergyBar focusEnergy={focusEnergy} className="w-full mb-3" showDecayHint />
                <div className="text-indigo-300 text-[10px] uppercase tracking-[0.2em] font-bold animate-pulse text-center">
                  {isTimerPaused ? 'Session Paused' : 'Stay Focused on your real tasks...'}
                </div>
                <div className="text-slate-400 font-mono text-[10px]">
                  Earn rate:{' '}
                  <span className="text-cyan-300/90">
                    {focusEarnPerMin} reams/min
                  </span>
                  {isTimerPaused ? ' (paused)' : ''}
                </div>
                {sessionPaper > 0 && (
                  <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 rounded-full">
                    <span className="text-sm">📄</span>
                    <span className="text-emerald-300 text-[11px] font-bold">
                      +{sessionPaper} ream{sessionPaper !== 1 ? 's' : ''} this session
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-4 w-full">
              <button
                onClick={togglePause}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
              >
                {isTimerPaused ? (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    Pause
                  </>
                )}
              </button>

              <button
                onClick={stopTimer}
                className="bg-red-500/20 hover:bg-red-500/40 text-red-400 p-3 rounded-xl transition-all active:scale-95"
                title="End Session"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
