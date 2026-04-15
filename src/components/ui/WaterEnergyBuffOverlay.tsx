import React, { useEffect, useState } from 'react';
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
    <div
      className="pointer-events-none absolute top-24 left-1/2 -translate-x-1/2 z-20 font-pixel animate-pulse"
      style={{
        background: 'var(--color-paper)',
        border: '3px solid var(--color-ink)',
        boxShadow: '4px 4px 0 0 #000',
        padding: '8px 16px',
      }}
    >
      <div className="text-[8px] font-bold uppercase" style={{ color: '#1d4ed8' }}>
        💧 HYDRATION BUFF ACTIVE
      </div>
      <div className="text-[7px]" style={{ color: 'var(--color-ink-faint)' }}>
        Energy regen boosted
      </div>
    </div>
  );
};
