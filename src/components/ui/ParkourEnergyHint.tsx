import React, { useEffect, useState } from 'react';
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
    <div
      className="pointer-events-none absolute top-32 left-1/2 z-30 -translate-x-1/2 rotate-1 font-pixel"
      style={{
        background: 'var(--color-legal)',
        border: '3px solid var(--color-ink)',
        boxShadow: '4px 4px 0 0 #000',
        padding: '10px 16px',
        maxWidth: '280px',
      }}
    >
      <div className="text-[8px] font-bold uppercase mb-1" style={{ color: 'var(--color-stamp-red)' }}>
        ⚠ LOW ENERGY
      </div>
      <p className="text-[8px] leading-snug" style={{ color: 'var(--color-ink)' }}>
        Double jump and roll need at least {PARKOUR_MIN_ENERGY_REQUIRED} energy
      </p>
    </div>
  );
};
