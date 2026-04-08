import React from 'react';
import type { OfficeTutorialPhase } from '../../hooks/useOfficeTutorial';

type Props = {
  phase: OfficeTutorialPhase;
  onSkip: () => void;
};

const COPY: Record<OfficeTutorialPhase, string> = {
  desk:
    'Follow the yellow line on the floor to your desk. Stand close and press [E] to start Focus and earn reams.',
  vending:
    'Head to the break room vending machine (Vend-O-Matic). Spend reams on ice cream, chair upgrades, and monitor upgrades.',
};

/** Bottom-screen hints for the first-visit office tutorial (desk, then vending). */
export function TutorialBanner({ phase, onSkip }: Props) {
  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-20 flex justify-center p-4 pb-6">
      <div className="pointer-events-auto flex max-w-lg flex-col gap-3 rounded-xl border border-amber-400/40 bg-slate-900/90 px-4 py-3 shadow-lg backdrop-blur-md sm:max-w-xl sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-amber-50 sm:text-base">{COPY[phase]}</p>
        <button
          type="button"
          onClick={onSkip}
          className="pixel-border shrink-0 rounded bg-slate-700 px-3 py-2 font-pixel text-[10px] uppercase tracking-wide text-slate-200 transition hover:bg-slate-600 sm:text-[9px]"
        >
          Skip tutorial
        </button>
      </div>
    </div>
  );
}
