import React, { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { PARKOUR_MIN_ENERGY_REQUIRED } from '../../focusEnergyModel';
import { useGameStore } from '../../store/useGameStore';

/** Brief toast when the player tries parkour below minimum energy. */
export const ParkourEnergyHint = () => {
  const until = useGameStore((s) => s.parkourEnergyHintUntil);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (until <= Date.now()) return;
    const id = setInterval(() => setTick((n) => n + 1), 120);
    const ms = Math.max(0, until - Date.now()) + 80;
    const to = window.setTimeout(() => clearInterval(id), ms);
    return () => {
      clearInterval(id);
      window.clearTimeout(to);
    };
  }, [until]);

  if (until <= Date.now()) return null;

  return (
    <div className="pointer-events-none absolute top-32 left-1/2 z-30 flex max-w-sm -translate-x-1/2 flex-col items-center gap-1 rounded-2xl border border-amber-500/50 bg-amber-950/90 px-4 py-2.5 shadow-lg shadow-amber-900/40 backdrop-blur-md">
      <div className="flex items-center gap-2 text-amber-100">
        <Zap className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
        <span className="text-sm font-bold tracking-tight">Not enough energy</span>
      </div>
      <p className="text-center text-[11px] leading-snug text-amber-200/90">
        Double jump and roll need at least {PARKOUR_MIN_ENERGY_REQUIRED} energy
      </p>
    </div>
  );
};
