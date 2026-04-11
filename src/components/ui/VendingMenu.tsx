import React, { useEffect, useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import { useGameStore } from '../../store/useGameStore';
import { ICE_CREAM_FLAVORS, ICE_CREAM_FLAVOR_COUNT } from '../../iceCreamFlavors';
import { ICE_CREAM_QUARTERS_MAX, ICE_CREAM_COST_REAMS, ICE_CREAM_DURATION_MS } from '../../gameConfig';

interface VendingMenuProps {
  onClose: () => void;
  socket: Socket | null;
}

export const VendingMenu = ({ onClose, socket }: VendingMenuProps) => {
  const paperReams = useGameStore((s) => s.paperReams);
  const addPaper = useGameStore((s) => s.addPaper);
  const setHeldIceCream = useGameStore((s) => s.setHeldIceCream);
  const [subView, setSubView] = useState<'main' | 'flavor'>('main');
  const [selectedFlavor, setSelectedFlavor] = useState(0);
  const [feedback, setFeedback] = useState<'insufficient' | 'offline' | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (subView === 'flavor') {
        e.preventDefault();
        setSubView('main');
        setFeedback(null);
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, subView]);

  const canAfford = paperReams >= ICE_CREAM_COST_REAMS;
  const socketOk = socket?.connected === true;

  const openFlavorSubmenu = () => {
    setFeedback(null);
    setSubView('flavor');
  };

  const handleConfirmBuy = () => {
    if (!canAfford) { setFeedback('insufficient'); return; }
    if (!socket?.connected) { setFeedback('offline'); return; }
    const flavorIndex = Math.min(Math.max(0, selectedFlavor), ICE_CREAM_FLAVOR_COUNT - 1);
    const expiresAt = Date.now() + ICE_CREAM_DURATION_MS;
    addPaper(-ICE_CREAM_COST_REAMS);
    setHeldIceCream({ flavorIndex, expiresAt, remainingQuarters: ICE_CREAM_QUARTERS_MAX });
    socket?.connected &&
      socket.emit('playerIceCream', {
        flavorIndex,
        expiresAt,
        remainingQuarters: ICE_CREAM_QUARTERS_MAX,
      });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vending-title"
    >
      <div
        className="relative w-full max-w-sm bg-slate-900 border-4 border-black pixel-border p-4 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col"
        style={{ boxShadow: '8px 8px 0 0 #1e1b4b' }}
      >
        <div className="flex items-start justify-between gap-3 pr-1 shrink-0">
          <div>
            <h2
              id="vending-title"
              className="font-pixel text-[10px] sm:text-xs text-violet-300 tracking-widest uppercase pr-8"
            >
              {subView === 'main' ? 'Vend-O-Matic' : 'Choose flavor'}
            </h2>
            {subView === 'main' ? (
              <p className="text-slate-400 font-mono text-[10px] mt-2">
                Your balance: <span className="text-amber-200">{paperReams.toLocaleString()}</span> reams
              </p>
            ) : (
              <p className="text-slate-500 font-mono text-[9px] mt-2">
                {ICE_CREAM_COST_REAMS} reams - balance {paperReams.toLocaleString()}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-violet-300 hover:text-white transition-colors z-10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {subView === 'main' ? (
          <>
            <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-1 space-y-3" style={{ scrollbarGutter: 'stable' }}>
              <div className="border-2 border-violet-500/40 bg-violet-950/40 p-3">
                <div className="grid grid-cols-[auto_minmax(92px,150px)_1fr] gap-3 items-start">
                  <button
                    type="button"
                    onClick={openFlavorSubmenu}
                    className="pixel-button font-pixel text-[8px] sm:text-[10px] text-center min-w-[94px]"
                  >
                    Buy
                  </button>
                  <p className="font-pixel text-[8px] sm:text-[10px] text-white pt-1">🍦 Ice Cream</p>
                  <p className="text-slate-400 text-[10px] sm:text-xs font-mono leading-snug pt-1">
                    Pick a flavor after tapping buy. Hold for 1 minute. Cost: {ICE_CREAM_COST_REAMS} reams.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-3 text-center text-slate-500 font-mono text-[10px]">
              For desk upgrades, press [F] at your desk.
            </p>
            <p className="mt-2 text-center text-slate-500 font-mono text-[10px] shrink-0">Press Esc to close</p>
          </>
        ) : (
          <div className="mt-4 overflow-y-auto pr-1 flex-1 min-h-0" style={{ scrollbarGutter: 'stable' }}>
            <button
              type="button"
              onClick={() => { setSubView('main'); setFeedback(null); }}
              className="flex items-center gap-1.5 text-violet-300 hover:text-white font-mono text-[10px] mb-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <p className="font-pixel text-[7px] sm:text-[8px] text-slate-500 uppercase tracking-wider mb-2">
              Flavor
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              {ICE_CREAM_FLAVORS.map((f, i) => (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => setSelectedFlavor(i)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded border-2 font-mono text-[10px] transition-colors ${
                    selectedFlavor === i
                      ? 'border-violet-400 bg-violet-950/80 text-white'
                      : 'border-slate-600 bg-slate-800/60 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-sm border border-black/40 shrink-0"
                    style={{ backgroundColor: f.color }}
                    aria-hidden
                  />
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleConfirmBuy}
                disabled={!canAfford || !socketOk}
                className="pixel-button font-pixel text-[8px] sm:text-[10px] text-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Purchase ({ICE_CREAM_COST_REAMS} reams)
              </button>
              {!socketOk && (
                <p className="text-center text-amber-400/90 text-[10px] font-mono">
                  Connect to the office so others can see your treat.
                </p>
              )}
              {feedback === 'insufficient' && (
                <p className="text-center text-rose-400/90 text-xs font-mono">
                  Not enough reams.
                </p>
              )}
              {feedback === 'offline' && (
                <p className="text-center text-rose-400/90 text-xs font-mono">
                  Not connected - try again when online.
                </p>
              )}
            </div>

            <p className="mt-5 text-center text-slate-500 font-mono text-[10px]">
              Esc - back to machine · Close (X) exits
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
