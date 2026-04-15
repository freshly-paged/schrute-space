import React, { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { useGameStore } from '../../store/useGameStore';
import { ICE_CREAM_FLAVORS, ICE_CREAM_FLAVOR_COUNT } from '../../iceCreamFlavors';
import {
  ICE_CREAM_QUARTERS_MAX,
  ICE_CREAM_COST_REAMS,
  ICE_CREAM_DURATION_MS,
  ICE_CREAM_BITE_FOCUS_ENERGY,
} from '../../gameConfig';

interface VendingMenuProps {
  onClose: () => void;
  socket: Socket | null;
}

/** Pixel-art ice cream scoop + cone drawn with plain divs. */
function PixelCone({ color, selected }: { color: string; selected: boolean }) {
  const border = selected ? '3px solid #000' : '2px solid rgba(0,0,0,0.25)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      {/* Scoop highlight dot */}
      <div style={{
        width: 6, height: 4,
        background: 'rgba(255,255,255,0.55)',
        borderRadius: '50%',
        position: 'relative',
        left: -6,
        top: 8,
        zIndex: 1,
        pointerEvents: 'none',
      }} />
      {/* Scoop body */}
      <div style={{
        width: 32, height: 28,
        background: color,
        borderRadius: '16px 16px 4px 4px',
        border,
        borderBottom: 'none',
        position: 'relative',
        zIndex: 0,
        imageRendering: 'pixelated',
      }} />
      {/* Cone body */}
      <div style={{
        width: 0, height: 0,
        borderLeft: '16px solid transparent',
        borderRight: '16px solid transparent',
        borderTop: `28px solid #c2770a`,
        filter: selected ? 'drop-shadow(0 0 0 2px #000)' : undefined,
      }} />
      {/* Cone tip */}
      <div style={{
        width: 4, height: 6,
        background: '#92400e',
        borderRadius: '0 0 2px 2px',
      }} />
    </div>
  );
}

export const VendingMenu = ({ onClose, socket }: VendingMenuProps) => {
  const paperReams = useGameStore((s) => s.paperReams);
  const addPaper = useGameStore((s) => s.addPaper);
  const setHeldIceCream = useGameStore((s) => s.setHeldIceCream);
  const [selectedFlavor, setSelectedFlavor] = useState(0);
  const [feedback, setFeedback] = useState<'insufficient' | 'offline' | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const canAfford = paperReams >= ICE_CREAM_COST_REAMS;
  const socketOk = socket?.connected === true;
  const flavor = ICE_CREAM_FLAVORS[selectedFlavor]!;
  const totalEnergy = ICE_CREAM_BITE_FOCUS_ENERGY * ICE_CREAM_QUARTERS_MAX;

  const handleBuy = () => {
    if (!canAfford) { setFeedback('insufficient'); return; }
    if (!socket?.connected) { setFeedback('offline'); return; }
    const flavorIndex = Math.min(Math.max(0, selectedFlavor), ICE_CREAM_FLAVOR_COUNT - 1);
    const expiresAt = Date.now() + ICE_CREAM_DURATION_MS;
    addPaper(-ICE_CREAM_COST_REAMS);
    setHeldIceCream({ flavorIndex, expiresAt, remainingQuarters: ICE_CREAM_QUARTERS_MAX });
    socket.emit('playerIceCream', { flavorIndex, expiresAt, remainingQuarters: ICE_CREAM_QUARTERS_MAX });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vending-title"
    >
      <div className="font-pixel w-full max-w-sm overflow-hidden" style={{
        background: 'var(--color-paper)',
        boxShadow: '0 -4px 0 0 #000, 0 4px 0 0 #000, -4px 0 0 0 #000, 4px 0 0 0 #000',
      }}>

        {/* ── Shop sign ── */}
        <div style={{ background: '#f472b6' }} className="px-4 py-3 text-center relative">
          {/* Pixel bunting dots */}
          <div className="flex justify-around mb-1">
            {['#ef4444','#facc15','#34d399','#60a5fa','#d946ef'].map((c, i) => (
              <div key={i} style={{ width: 8, height: 8, background: c, border: '2px solid #000' }} />
            ))}
          </div>
          <h2 id="vending-title" className="text-white text-[9px] uppercase tracking-widest">
            🍦 Sweet Treats
          </h2>
          <div className="text-[7px] uppercase" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Vend-O-Matic · Breakroom Edition
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-2 right-3 text-[8px] text-white/70 hover:text-white"
            style={{ fontFamily: 'var(--font-pixel)' }}
          >
            ✕
          </button>
        </div>

        {/* ── Display case ── */}
        <div className="p-3" style={{ background: '#1e293b', borderTop: '4px solid #000', borderBottom: '4px solid #000' }}>
          {/* Glass reflection strip */}
          <div style={{ background: 'rgba(255,255,255,0.06)', height: 3, marginBottom: 8 }} />

          <div className="grid grid-cols-5 gap-2 justify-items-center">
            {ICE_CREAM_FLAVORS.map((f, i) => (
              <button
                key={f.label}
                type="button"
                onClick={() => { setSelectedFlavor(i); setFeedback(null); }}
                className="flex flex-col items-center gap-1 transition-transform active:scale-95"
                style={{
                  padding: '6px 4px',
                  background: i === selectedFlavor ? 'rgba(255,255,255,0.15)' : 'transparent',
                  border: i === selectedFlavor ? '2px solid #f472b6' : '2px solid transparent',
                  outline: 'none',
                }}
                title={f.label}
              >
                <PixelCone color={f.color} selected={i === selectedFlavor} />
                <span className="text-[6px] uppercase mt-1" style={{ color: i === selectedFlavor ? '#f9a8d4' : '#94a3b8' }}>
                  {f.label}
                </span>
              </button>
            ))}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.06)', height: 3, marginTop: 8 }} />
        </div>

        {/* ── Order panel ── */}
        <div className="px-4 pt-3 pb-2 flex flex-col gap-3">

          {/* Selected flavor info */}
          <div className="flex items-center gap-3">
            <div style={{
              width: 12, height: 12, background: flavor.color,
              border: '2px solid #000', flexShrink: 0,
            }} />
            <div>
              <div className="text-[8px] font-bold uppercase" style={{ color: 'var(--color-ink)' }}>
                {flavor.label} Ice Cream
              </div>
              <div className="text-[7px]" style={{ color: 'var(--color-ink-faint)' }}>
                +{totalEnergy} ⚡ energy  ·  {ICE_CREAM_QUARTERS_MAX} bites  ·  press [B] to eat
              </div>
            </div>
          </div>

          <hr className="memo-rule" />

          {/* Price & balance */}
          <div className="flex justify-between text-[8px]">
            <span style={{ color: 'var(--color-ink-faint)' }}>PRICE</span>
            <span className="font-bold" style={{ color: 'var(--color-schrute)' }}>{ICE_CREAM_COST_REAMS} reams</span>
          </div>
          <div className="flex justify-between text-[8px]">
            <span style={{ color: 'var(--color-ink-faint)' }}>YOUR BALANCE</span>
            <span className="font-bold" style={{ color: canAfford ? '#166534' : 'var(--color-stamp-red)' }}>
              {paperReams.toLocaleString()} reams
            </span>
          </div>

          {/* Buy button */}
          <button
            type="button"
            onClick={handleBuy}
            disabled={!canAfford || !socketOk}
            className="pixel-button text-[8px] w-full disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ padding: '10px', textAlign: 'center' }}
          >
            {canAfford ? `🍦 Buy ${flavor.label}` : 'Not enough reams'}
          </button>

          {/* Feedback */}
          {!socketOk && (
            <p className="text-center text-[8px]" style={{ color: '#b45309' }}>
              Connect to office so others can see your treat.
            </p>
          )}
          {feedback === 'offline' && (
            <p className="text-center text-[8px]" style={{ color: 'var(--color-stamp-red)' }}>
              Not connected — try again when online.
            </p>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-4 py-2 text-center text-[7px]" style={{
          borderTop: '2px solid var(--color-ink)',
          color: 'var(--color-ink-faint)',
        }}>
          © DUNDER MIFFLIN PAPER CO. · Press Esc to close
        </div>
      </div>
    </div>
  );
};
