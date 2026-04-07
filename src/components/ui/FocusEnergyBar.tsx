import React from 'react';
import { Zap } from 'lucide-react';
import {
  FOCUS_ENERGY_DECAY_ZONE_HINT_EN,
  FOCUS_ENERGY_MAX,
  isFocusEnergyInDecayZone,
} from '../../focusEnergyModel';

function energyBarTone(percent: number): string {
  if (percent >= 70) return 'bg-emerald-500';
  if (percent >= 30) return 'bg-amber-400';
  return 'bg-red-500';
}

interface FocusEnergyBarProps {
  focusEnergy: number;
  className?: string;
  /** When true, show an English tip while energy is in the shared decay zone (below full-effect ratio). */
  showDecayHint?: boolean;
}

export function FocusEnergyBar({ focusEnergy, className, showDecayHint }: FocusEnergyBarProps) {
  const pct = Math.min(100, Math.max(0, (focusEnergy / FOCUS_ENERGY_MAX) * 100));
  const displayEnergy = Math.round(focusEnergy);
  const inDecay = showDecayHint && isFocusEnergyInDecayZone(focusEnergy);
  return (
    <div className={className ? `space-y-1.5 ${className}` : 'space-y-1.5'}>
      <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase tracking-widest font-semibold">
        <Zap className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
        <span>Energy</span>
        <span className="text-white font-bold tabular-nums normal-case tracking-normal ml-auto">
          {displayEnergy}/{FOCUS_ENERGY_MAX}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-black/40 border border-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out ${energyBarTone(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {inDecay && (
        <p className="text-[10px] leading-snug text-amber-200/95 normal-case tracking-normal font-medium text-center">
          {FOCUS_ENERGY_DECAY_ZONE_HINT_EN}
        </p>
      )}
    </div>
  );
}
