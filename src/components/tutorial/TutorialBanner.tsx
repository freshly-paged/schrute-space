import React from 'react';
import { PHASE_ORDER, TUTORIAL_DIALOGUE, type OfficeTutorialPhase } from '../../tutorialCopy';
import { MichaelScottAvatar } from './MichaelScottAvatar';

// These phases require the Next button (no automatic advance trigger)
const MANUAL_PHASES = new Set<OfficeTutorialPhase>(['intro', 'focus-energy', 'leaderboard', 'exit']);

type Props = {
  phase: OfficeTutorialPhase;
  onNext: () => void;
  onSkip: () => void;
};

export function TutorialBanner({ phase, onNext, onSkip }: Props) {
  const stepNumber = PHASE_ORDER.indexOf(phase) + 1;
  const totalSteps = PHASE_ORDER.length;
  const isManual = MANUAL_PHASES.has(phase);

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-20 flex justify-center p-4 pb-6">
      <div className="pointer-events-auto flex w-full max-w-2xl gap-0 border-4 border-black bg-slate-900 pixel-border">
        {/* Michael Scott avatar panel */}
        <div className="flex shrink-0 flex-col items-center justify-end gap-1 border-r-4 border-black bg-slate-800 px-3 pb-3 pt-3">
          <MichaelScottAvatar />
          <span className="mt-1 font-pixel text-[6px] leading-tight text-amber-400">MICHAEL SCOTT</span>
          <span className="font-pixel text-[5px] leading-tight text-slate-400">REGIONAL MANAGER</span>
        </div>

        {/* Dialogue panel */}
        <div className="flex flex-1 flex-col gap-2 px-4 py-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="font-pixel text-[7px] tracking-wide text-amber-400 uppercase">
              Orientation — Step {stepNumber} of {totalSteps}
            </span>
            <span className="font-pixel text-[6px] text-slate-500 uppercase tracking-widest">
              Dunder Mifflin Scranton
            </span>
          </div>

          {/* Dialogue text */}
          <p className="flex-1 text-sm leading-relaxed text-amber-50">
            {TUTORIAL_DIALOGUE[phase]}
          </p>

          {/* Footer hint + buttons */}
          <div className="flex items-end justify-between gap-3">
            {isManual ? (
              <span className="font-pixel text-[6px] text-slate-500">
                &gt; Read carefully. This will not be on a test.
              </span>
            ) : (
              <span className="font-pixel text-[6px] text-slate-400">
                &gt; Follow the yellow line. Or click Next.
              </span>
            )}

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={onSkip}
                className="pixel-border rounded bg-slate-700 px-3 py-2 font-pixel text-[8px] uppercase tracking-wide text-slate-300 transition hover:bg-slate-600"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={onNext}
                className="pixel-button px-4 py-2 font-pixel text-[8px] uppercase tracking-wide"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
