import React, { useEffect, useState } from 'react';
import { Droplets } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

export const WaterEnergyBuffOverlay = () => {
  const waterBuffExpiresAt = useGameStore((s) => s.waterBuffExpiresAt);
  const setWaterBuffExpiresAt = useGameStore((s) => s.setWaterBuffExpiresAt);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (waterBuffExpiresAt == null) return;
    const id = setInterval(() => {
      setTick((t) => t + 1);
      if (Date.now() >= waterBuffExpiresAt) {
        setWaterBuffExpiresAt(null);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [waterBuffExpiresAt, setWaterBuffExpiresAt]);

  if (waterBuffExpiresAt == null || Date.now() >= waterBuffExpiresAt) return null;

  return (
    <div className="pointer-events-none absolute top-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-2xl border border-sky-400/60 bg-sky-950/80 px-4 py-2 shadow-lg shadow-sky-500/20 backdrop-blur-md animate-pulse">
      <Droplets className="h-5 w-5 shrink-0 text-sky-300" aria-hidden />
      <span className="text-sm font-bold tracking-tight text-sky-100">Water energy refilled</span>
    </div>
  );
};
