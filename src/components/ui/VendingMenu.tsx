import React, { useEffect, useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import { useGameStore } from '../../store/useGameStore';
import { ICE_CREAM_FLAVORS, ICE_CREAM_FLAVOR_COUNT } from '../../iceCreamFlavors';
import { ICE_CREAM_QUARTERS_MAX } from '../../gameConfig';
import {
  CHAIR_UPGRADE_COST_REAMS,
  CHAIR_UPGRADE_MAX_LEVEL,
} from '../../chairUpgradeConstants';
import {
  MONITOR_UPGRADE_MAX_LEVEL,
  monitorUpgradeCostForNextLevel,
} from '../../monitorUpgradeConstants';
import {
  FOCUS_ENERGY_SEATED_REGEN_MAX_PER_MIN,
  FOCUS_ENERGY_SEATED_REGEN_PER_CHAIR_LEVEL_PER_MIN,
} from '../../focusEnergyModel';

import {
  ICE_CREAM_COST_REAMS,
  ICE_CREAM_DURATION_MS,
  TEAM_PYRAMID_COST_REAMS,
} from '../../gameConfig';

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

type TeamPyramidPurchaseAck =
  | { ok: true; paperReams: number; expiresAt: number }
  | { ok: false; error: 'insufficient' | 'not_in_room' | 'server_error' };

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
  const setTeamPyramidBuffExpiresAt = useGameStore((s) => s.setTeamPyramidBuffExpiresAt);
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
  const [pyramidBusy, setPyramidBusy] = useState(false);
  const [pyramidFeedback, setPyramidFeedback] = useState<
    'insufficient' | 'offline' | 'not_in_room' | 'server_error' | null
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
  const canAffordPyramid = paperReams >= TEAM_PYRAMID_COST_REAMS;

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
    setHeldIceCream({ flavorIndex, expiresAt, remainingQuarters: ICE_CREAM_QUARTERS_MAX });
    socket?.connected &&
      socket.emit('playerIceCream', {
        flavorIndex,
        expiresAt,
        remainingQuarters: ICE_CREAM_QUARTERS_MAX,
      });
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

  const handleBuyTeamPyramid = () => {
    setPyramidFeedback(null);
    if (!socket?.connected) {
      setPyramidFeedback('offline');
      return;
    }
    if (!canAffordPyramid) {
      setPyramidFeedback('insufficient');
      return;
    }
    setPyramidBusy(true);
    socket.timeout(12_000).emit('purchaseTeamPyramid', (socketErr: Error | null, res: unknown) => {
      setPyramidBusy(false);
      if (socketErr) {
        setPyramidFeedback('server_error');
        return;
      }
      const r = res as TeamPyramidPurchaseAck;
      if (!r || typeof r !== 'object' || !('ok' in r)) {
        setPyramidFeedback('server_error');
        return;
      }
      if (r.ok === true) {
        setPaperReams(r.paperReams);
        setTeamPyramidBuffExpiresAt(r.expiresAt);
        onClose();
        return;
      }
      const fail = r.error;
      if (fail === 'insufficient') setPyramidFeedback('insufficient');
      else if (fail === 'not_in_room') setPyramidFeedback('not_in_room');
      else setPyramidFeedback('server_error');
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
        className="relative w-full max-w-5xl bg-slate-900 border-4 border-black pixel-border p-4 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col"
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

              <div className="border-2 border-fuchsia-600/45 bg-fuchsia-950/30 p-3">
                <div className="grid grid-cols-[auto_minmax(92px,150px)_1fr] gap-3 items-start">
                  <button
                    type="button"
                    onClick={handleBuyTeamPyramid}
                    disabled={!socketOk || pyramidBusy}
                    className="pixel-button font-pixel text-[8px] sm:text-[10px] text-center min-w-[94px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pyramidBusy ? 'Wait' : 'Buy'}
                  </button>
                  <p className="font-pixel text-[8px] sm:text-[10px] text-fuchsia-100 pt-1">🔺 Team Pyramid</p>
                  <p className="text-slate-400 text-[10px] sm:text-xs font-mono leading-snug pt-1">
                    Team buff: +50% paper for 3 hours while focusing. Cost: {TEAM_PYRAMID_COST_REAMS} reams.
                  </p>
                </div>
                {pyramidFeedback === 'insufficient' && (
                  <p className="text-rose-400/90 text-xs font-mono mt-2">Not enough reams.</p>
                )}
                {pyramidFeedback === 'not_in_room' && (
                  <p className="text-rose-400/90 text-xs font-mono mt-2">Join the office room first.</p>
                )}
                {pyramidFeedback === 'server_error' && (
                  <p className="text-rose-400/90 text-xs font-mono mt-2">
                    Could not complete purchase - try again.
                  </p>
                )}
                {pyramidFeedback === 'offline' && (
                  <p className="text-rose-400/90 text-xs font-mono mt-2">
                    Not connected - try again when online.
                  </p>
                )}
              </div>

              <div className="border-2 border-amber-600/40 bg-amber-950/25 p-3">
                <div className="grid grid-cols-[auto_minmax(92px,150px)_1fr] gap-3 items-start">
                  <button
                    type="button"
                    onClick={handleBuyChairUpgrade}
                    disabled={!socketOk || chairMaxed || chairBusy}
                    className="pixel-button font-pixel text-[8px] sm:text-[10px] text-center min-w-[94px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {chairMaxed ? 'Maxed' : chairBusy ? 'Wait' : 'Buy'}
                  </button>
                  <p className="font-pixel text-[8px] sm:text-[10px] text-amber-100 pt-1">🪑 Chair Upgrade</p>
                  <div className="text-slate-400 text-[10px] sm:text-xs font-mono leading-snug pt-1">
                    Bigger seat and desk style upgrades that everyone can see. Cost:{' '}
                    {CHAIR_UPGRADE_COST_REAMS} reams.
                    <p className="text-slate-500 text-[9px] sm:text-[10px] mt-1">
                      Seated focus: +{FOCUS_ENERGY_SEATED_REGEN_PER_CHAIR_LEVEL_PER_MIN} energy/min each level
                      (max +{FOCUS_ENERGY_SEATED_REGEN_MAX_PER_MIN}/min).
                    </p>
                    <p className="text-slate-500 text-[9px] sm:text-[10px] mt-1">
                      Your level:{' '}
                      <span className="text-amber-200">
                        {myChairLevel}/{CHAIR_UPGRADE_MAX_LEVEL}
                      </span>
                    </p>
                  </div>
                </div>
                {!socketOk && (
                  <p className="text-amber-400/90 text-[10px] font-mono mt-2">Connect to purchase upgrades.</p>
                )}
                {chairFeedback === 'insufficient' && (
                  <p className="text-rose-400/90 text-xs font-mono mt-2">Not enough reams.</p>
                )}
                {chairFeedback === 'max_level' && (
                  <p className="text-slate-400 text-xs font-mono mt-2">
                    Already at max level ({CHAIR_UPGRADE_MAX_LEVEL}).
                  </p>
                )}
                {chairFeedback === 'not_in_room' && (
                  <p className="text-rose-400/90 text-xs font-mono mt-2">Join the office room first.</p>
                )}
                {chairFeedback === 'server_error' && (
                  <p className="text-rose-400/90 text-xs font-mono mt-2">
                    Could not complete purchase - try again.
                  </p>
                )}
                {chairFeedback === 'offline' && (
                  <p className="text-rose-400/90 text-xs font-mono mt-2">
                    Not connected - try again when online.
                  </p>
                )}
              </div>

              <div className="border-2 border-cyan-700/40 bg-cyan-950/20 p-3">
                <div className="grid grid-cols-[auto_minmax(92px,150px)_1fr] gap-3 items-start">
                  <button
                    type="button"
                    onClick={handleBuyMonitorUpgrade}
                    disabled={!socketOk || monitorMaxed || monitorBusy}
                    className="pixel-button font-pixel text-[8px] sm:text-[10px] text-center min-w-[94px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {monitorMaxed ? 'Maxed' : monitorBusy ? 'Wait' : 'Buy'}
                  </button>
                  <p className="font-pixel text-[8px] sm:text-[10px] text-cyan-100 pt-1">🖥️ Desk Monitors</p>
                  <div className="text-slate-400 text-[10px] sm:text-xs font-mono leading-snug pt-1">
                    Add screens to your desk (up to 8). First 3 upgrades add +1 ream/min while focusing.
                    {!monitorMaxed && (
                      <p className="text-slate-500 text-[9px] sm:text-[10px] mt-1">
                        Next upgrade costs {nextMonitorCost} reams.
                      </p>
                    )}
                    <p className="text-slate-500 text-[9px] sm:text-[10px] mt-1">
                      Upgrades:{' '}
                      <span className="text-cyan-200">
                        {myMonitorLevel}/{MONITOR_UPGRADE_MAX_LEVEL}
                      </span>
                    </p>
                  </div>
                </div>
                {monitorFeedback === 'insufficient' && (
                  <p className="text-rose-400/90 text-xs font-mono mt-2">Not enough reams.</p>
                )}
                {monitorFeedback === 'max_level' && (
                  <p className="text-slate-400 text-xs font-mono mt-2">
                    Already at max ({MONITOR_UPGRADE_MAX_LEVEL} upgrades, 8 monitors).
                  </p>
                )}
                {monitorFeedback === 'not_in_room' && (
                  <p className="text-rose-400/90 text-xs font-mono mt-2">Join the office room first.</p>
                )}
                {monitorFeedback === 'server_error' && (
                  <p className="text-rose-400/90 text-xs font-mono mt-2">
                    Could not complete purchase - try again.
                  </p>
                )}
                {monitorFeedback === 'offline' && (
                  <p className="text-rose-400/90 text-xs font-mono mt-2">
                    Not connected - try again when online.
                  </p>
                )}
              </div>
            </div>

            <p className="mt-4 text-center text-slate-500 font-mono text-[10px] shrink-0">Press Esc to close</p>
          </>
        ) : (
          <div className="mt-4 overflow-y-auto pr-1 flex-1 min-h-0" style={{ scrollbarGutter: 'stable' }}>
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
