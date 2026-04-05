import React, { useEffect, useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import { useGameStore } from '../../store/useGameStore';
import { ICE_CREAM_FLAVORS, ICE_CREAM_FLAVOR_COUNT } from '../../iceCreamFlavors';
import {
  CHAIR_UPGRADE_COST_REAMS,
  CHAIR_UPGRADE_MAX_LEVEL,
} from '../../chairUpgradeConstants';
import {
  MONITOR_UPGRADE_MAX_LEVEL,
  monitorUpgradeCostForNextLevel,
} from '../../monitorUpgradeConstants';

/** Ice cream price in paper reams (syncs to server via existing savePaperReams). */
const ICE_CREAM_COST_REAMS = 2;
const ICE_CREAM_DURATION_MS = 60_000;

interface VendingMenuProps {
  onClose: () => void;
  socket: Socket | null;
}

type ChairPurchaseAck =
  | { ok: true; paperReams: number; chairUpgradeLevel: number }
  | { ok: false; error: 'max_level' | 'insufficient' | 'not_in_room' | 'server_error' };

type MonitorPurchaseAck =
  | { ok: true; paperReams: number; monitorUpgradeLevel: number }
  | { ok: false; error: 'max_level' | 'insufficient' | 'not_in_room' | 'server_error' };

export const VendingMenu = ({ onClose, socket }: VendingMenuProps) => {
  const paperReams = useGameStore((s) => s.paperReams);
  const addPaper = useGameStore((s) => s.addPaper);
  const setHeldIceCream = useGameStore((s) => s.setHeldIceCream);
  const user = useGameStore((s) => s.user);
  const chairLevelByEmail = useGameStore((s) => s.chairLevelByEmail);
  const setPaperReams = useGameStore((s) => s.setPaperReams);
  const patchChairLevel = useGameStore((s) => s.patchChairLevel);
  const monitorLevelByEmail = useGameStore((s) => s.monitorLevelByEmail);
  const patchMonitorLevel = useGameStore((s) => s.patchMonitorLevel);
  const [subView, setSubView] = useState<'main' | 'flavor'>('main');
  const [selectedFlavor, setSelectedFlavor] = useState(0);
  const [feedback, setFeedback] = useState<'insufficient' | 'offline' | null>(null);
  const [chairBusy, setChairBusy] = useState(false);
  const [chairFeedback, setChairFeedback] = useState<
    'insufficient' | 'max_level' | 'offline' | 'not_in_room' | 'server_error' | null
  >(null);
  const [monitorBusy, setMonitorBusy] = useState(false);
  const [monitorFeedback, setMonitorFeedback] = useState<
    'insufficient' | 'max_level' | 'offline' | 'not_in_room' | 'server_error' | null
  >(null);

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

  const myChairLevel = user?.email ? (chairLevelByEmail[user.email] ?? 0) : 0;
  const chairMaxed = myChairLevel >= CHAIR_UPGRADE_MAX_LEVEL;
  const canAffordChair = paperReams >= CHAIR_UPGRADE_COST_REAMS;

  const myMonitorLevel = user?.email ? (monitorLevelByEmail[user.email] ?? 0) : 0;
  const monitorMaxed = myMonitorLevel >= MONITOR_UPGRADE_MAX_LEVEL;
  const nextMonitorCost = monitorMaxed ? 0 : monitorUpgradeCostForNextLevel(myMonitorLevel);
  const canAffordMonitor = !monitorMaxed && paperReams >= nextMonitorCost;

  const openFlavorSubmenu = () => {
    setFeedback(null);
    setSubView('flavor');
  };

  const handleConfirmBuy = () => {
    if (!canAfford) {
      setFeedback('insufficient');
      return;
    }
    if (!socket?.connected) {
      setFeedback('offline');
      return;
    }
    const flavorIndex = Math.min(Math.max(0, selectedFlavor), ICE_CREAM_FLAVOR_COUNT - 1);
    const expiresAt = Date.now() + ICE_CREAM_DURATION_MS;
    addPaper(-ICE_CREAM_COST_REAMS);
    setHeldIceCream({ flavorIndex, expiresAt });
    socket?.connected && socket.emit('playerIceCream', { flavorIndex, expiresAt });
    onClose();
  };

  const handleBuyChairUpgrade = () => {
    setChairFeedback(null);
    if (!socket?.connected) {
      setChairFeedback('offline');
      return;
    }
    if (chairMaxed) {
      setChairFeedback('max_level');
      return;
    }
    if (!canAffordChair) {
      setChairFeedback('insufficient');
      return;
    }
    setChairBusy(true);
    socket.timeout(12_000).emit('purchaseChairUpgrade', (socketErr: Error | null, res: unknown) => {
      setChairBusy(false);
      if (socketErr) {
        setChairFeedback('server_error');
        return;
      }
      const r = res as ChairPurchaseAck;
      if (!r || typeof r !== 'object' || !('ok' in r)) {
        setChairFeedback('server_error');
        return;
      }
      if (r.ok === true) {
        setPaperReams(r.paperReams);
        if (user?.email) patchChairLevel(user.email, r.chairUpgradeLevel);
        return;
      }
      const fail = r.error;
      if (fail === 'max_level') setChairFeedback('max_level');
      else if (fail === 'insufficient') setChairFeedback('insufficient');
      else if (fail === 'not_in_room') setChairFeedback('not_in_room');
      else setChairFeedback('server_error');
    });
  };

  const handleBuyMonitorUpgrade = () => {
    setMonitorFeedback(null);
    if (!socket?.connected) {
      setMonitorFeedback('offline');
      return;
    }
    if (monitorMaxed) {
      setMonitorFeedback('max_level');
      return;
    }
    if (!canAffordMonitor) {
      setMonitorFeedback('insufficient');
      return;
    }
    setMonitorBusy(true);
    socket.timeout(12_000).emit('purchaseMonitorUpgrade', (socketErr: Error | null, res: unknown) => {
      setMonitorBusy(false);
      if (socketErr) {
        setMonitorFeedback('server_error');
        return;
      }
      const r = res as MonitorPurchaseAck;
      if (!r || typeof r !== 'object' || !('ok' in r)) {
        setMonitorFeedback('server_error');
        return;
      }
      if (r.ok === true) {
        setPaperReams(r.paperReams);
        if (user?.email) patchMonitorLevel(user.email, r.monitorUpgradeLevel);
        return;
      }
      const fail = r.error;
      if (fail === 'max_level') setMonitorFeedback('max_level');
      else if (fail === 'insufficient') setMonitorFeedback('insufficient');
      else if (fail === 'not_in_room') setMonitorFeedback('not_in_room');
      else setMonitorFeedback('server_error');
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vending-title"
    >
      <div
        className="relative w-full max-w-md bg-slate-900 border-4 border-black pixel-border p-6 shadow-2xl"
        style={{ boxShadow: '8px 8px 0 0 #1e1b4b' }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-violet-300 hover:text-white transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {subView === 'main' ? (
          <>
            <h2
              id="vending-title"
              className="font-pixel text-[10px] sm:text-xs text-violet-300 tracking-widest uppercase mb-3 pr-8"
            >
              Vend-O-Matic
            </h2>
            <p className="text-slate-400 font-mono text-[10px] mb-5">
              Your balance: <span className="text-amber-200">{paperReams.toLocaleString()}</span> reams
            </p>

            <div className="border-2 border-violet-500/40 bg-violet-950/40 p-4 mb-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-pixel text-[8px] sm:text-[10px] text-white mb-1">Ice Cream</p>
                  <p className="text-slate-400 text-xs font-mono">
                    Pick a flavor after you tap buy — hold 1 min
                  </p>
                </div>
                <span className="font-mono text-amber-300 text-sm shrink-0">
                  {ICE_CREAM_COST_REAMS} reams
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={openFlavorSubmenu}
              className="pixel-button font-pixel text-[8px] sm:text-[10px] text-center w-full mb-5"
            >
              Buy ice cream
            </button>

            <div className="border-2 border-amber-600/40 bg-amber-950/25 p-4 mb-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-pixel text-[8px] sm:text-[10px] text-amber-100 mb-1">
                    Desk Chair Upgrade
                  </p>
                  <p className="text-slate-400 text-[10px] sm:text-xs font-mono leading-snug">
                    Bigger seat, gold trim, studs &amp; plants — everyone sees it at your desk.
                  </p>
                  <p className="text-slate-500 font-mono text-[9px] mt-2">
                    Your level:{' '}
                    <span className="text-amber-200">
                      {myChairLevel}/{CHAIR_UPGRADE_MAX_LEVEL}
                    </span>
                  </p>
                </div>
                <span className="font-mono text-amber-300 text-sm shrink-0">
                  {CHAIR_UPGRADE_COST_REAMS} reams
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBuyChairUpgrade}
              disabled={!socketOk || chairMaxed || chairBusy}
              className="pixel-button font-pixel text-[8px] sm:text-[10px] text-center w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {chairMaxed
                ? 'Chair fully upgraded'
                : chairBusy
                  ? 'Processing…'
                  : `Upgrade chair (${CHAIR_UPGRADE_COST_REAMS} reams)`}
            </button>
            {!socketOk && (
              <p className="text-center text-amber-400/90 text-[10px] font-mono mt-2">
                Connect to purchase upgrades.
              </p>
            )}
            {chairFeedback === 'insufficient' && (
              <p className="text-center text-rose-400/90 text-xs font-mono mt-2">
                Not enough reams.
              </p>
            )}
            {chairFeedback === 'max_level' && (
              <p className="text-center text-slate-400 text-xs font-mono mt-2">
                Already at max level ({CHAIR_UPGRADE_MAX_LEVEL}).
              </p>
            )}
            {chairFeedback === 'not_in_room' && (
              <p className="text-center text-rose-400/90 text-xs font-mono mt-2">
                Join the office room first.
              </p>
            )}
            {chairFeedback === 'server_error' && (
              <p className="text-center text-rose-400/90 text-xs font-mono mt-2">
                Could not complete purchase — try again.
              </p>
            )}
            {chairFeedback === 'offline' && (
              <p className="text-center text-rose-400/90 text-xs font-mono mt-2">
                Not connected — try again when online.
              </p>
            )}

            <div className="border-2 border-cyan-700/40 bg-cyan-950/20 p-4 mb-4 mt-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-pixel text-[8px] sm:text-[10px] text-cyan-100 mb-1">
                    Desk monitors
                  </p>
                  <p className="text-slate-400 text-[10px] sm:text-xs font-mono leading-snug">
                    Add a screen on your desk each time (up to 8). First 3 upgrades also add +1 ream/min
                    while focusing; later ones are look-only.
                  </p>
                  <p className="text-slate-500 font-mono text-[9px] mt-2">
                    Upgrades:{' '}
                    <span className="text-cyan-200">
                      {myMonitorLevel}/{MONITOR_UPGRADE_MAX_LEVEL}
                    </span>
                    {!monitorMaxed && (
                      <span className="text-slate-500">
                        {' '}
                        → next: {1 + myMonitorLevel} monitors ({nextMonitorCost} reams)
                      </span>
                    )}
                  </p>
                </div>
                {!monitorMaxed && (
                  <span className="font-mono text-cyan-300 text-sm shrink-0">{nextMonitorCost} reams</span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleBuyMonitorUpgrade}
              disabled={!socketOk || monitorMaxed || monitorBusy}
              className="pixel-button font-pixel text-[8px] sm:text-[10px] text-center w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {monitorMaxed
                ? 'Monitors maxed (8 screens)'
                : monitorBusy
                  ? 'Processing…'
                  : `Add monitor (${nextMonitorCost} reams)`}
            </button>
            {monitorFeedback === 'insufficient' && (
              <p className="text-center text-rose-400/90 text-xs font-mono mt-2">
                Not enough reams.
              </p>
            )}
            {monitorFeedback === 'max_level' && (
              <p className="text-center text-slate-400 text-xs font-mono mt-2">
                Already at max ({MONITOR_UPGRADE_MAX_LEVEL} upgrades, 8 monitors).
              </p>
            )}
            {monitorFeedback === 'not_in_room' && (
              <p className="text-center text-rose-400/90 text-xs font-mono mt-2">
                Join the office room first.
              </p>
            )}
            {monitorFeedback === 'server_error' && (
              <p className="text-center text-rose-400/90 text-xs font-mono mt-2">
                Could not complete purchase — try again.
              </p>
            )}
            {monitorFeedback === 'offline' && (
              <p className="text-center text-rose-400/90 text-xs font-mono mt-2">
                Not connected — try again when online.
              </p>
            )}

            <p className="mt-5 text-center text-slate-500 font-mono text-[10px]">Press Esc to close</p>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setSubView('main');
                setFeedback(null);
              }}
              className="flex items-center gap-1.5 text-violet-300 hover:text-white font-mono text-[10px] mb-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <h2
              id="vending-flavor-title"
              className="font-pixel text-[10px] sm:text-xs text-violet-300 tracking-widest uppercase mb-1 pr-8"
            >
              Choose flavor
            </h2>
            <p className="text-slate-500 font-mono text-[9px] mb-4">
              {ICE_CREAM_COST_REAMS} reams — balance {paperReams.toLocaleString()}
            </p>

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
                  Not connected — try again when online.
                </p>
              )}
            </div>

            <p className="mt-5 text-center text-slate-500 font-mono text-[10px]">
              Esc — back to machine · Close (X) exits
            </p>
          </>
        )}
      </div>
    </div>
  );
};
