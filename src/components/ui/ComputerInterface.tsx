import React, { useEffect, useRef, useState } from 'react';
import { X, Settings, FileText, Clock, Wifi, Monitor, ShoppingBag, Users } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import { useGameStore } from '../../store/useGameStore';
import { DESK_ITEM_CATALOG } from '../../deskItemCatalog';
import { TEAM_UPGRADE_DEFS } from '../../teamUpgradeDefs';
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
import type { DeskItemPlacement } from '../../types';

type Tab = 'dashboard' | 'upgrades' | 'shop' | 'perks';

interface ComputerInterfaceProps {
  onClose: () => void;
  onOpenAdminPanel: () => void;
  socket: Socket | null;
}

// ── Upgrade purchase ack types ───────────────────────────────────────────────
type ChairPurchaseAck =
  | { ok: true; paperReams: number; chairUpgradeLevel: number }
  | { ok: false; error: 'max_level' | 'insufficient' | 'not_in_room' | 'server_error' };

type MonitorPurchaseAck =
  | { ok: true; paperReams: number; monitorUpgradeLevel: number }
  | { ok: false; error: 'max_level' | 'insufficient' | 'not_in_room' | 'server_error' };

type DeskItemPurchaseAck =
  | { ok: true; paperReams: number; items: DeskItemPlacement[] }
  | { ok: false; error: 'already_owned' | 'insufficient' | 'not_found' | 'not_in_room' | 'server_error' };

type ContributeAck =
  | { ok: true; paperReams: number; pool: import('../../types').TeamUpgradePool }
  | { ok: false; error: string };

// ── Dashboard tab ────────────────────────────────────────────────────────────
function DashboardTab({ onClose, onOpenAdminPanel }: { onClose: () => void; onOpenAdminPanel: () => void }) {
  const user = useGameStore((s) => s.user);
  const paperReams = useGameStore((s) => s.paperReams);
  const isTimerActive = useGameStore((s) => s.isTimerActive);
  const timeLeft = useGameStore((s) => s.timeLeft);
  const sessionPaper = useGameStore((s) => s.sessionPaper);
  const myRole = useGameStore((s) => s.roomInfo?.myRole ?? null);
  const roomId = useGameStore((s) => s.roomInfo?.roomId ?? null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const displayName = user?.name ?? user?.email?.split('@')[0] ?? 'Employee';

  return (
    <div className="flex flex-col gap-5">
      <div className="border border-[#00c8ff]/30 bg-[#00c8ff]/5 px-5 py-4 rounded">
        <div className="text-[#00c8ff] text-sm mb-1">
          Welcome back, <span className="text-white font-bold">{displayName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Wifi className="w-3 h-3 text-emerald-400" />
          <span className="text-emerald-400 text-[10px] tracking-widest uppercase">Connected — {roomId ?? 'Office'}</span>
          {myRole && (
            <span className={`ml-2 text-[9px] px-2 py-0.5 rounded border ${
              myRole === 'admin' ? 'border-amber-400/50 text-amber-400 bg-amber-400/10' :
              myRole === 'manager' ? 'border-indigo-400/50 text-indigo-400 bg-indigo-400/10' :
              'border-slate-400/50 text-slate-400 bg-slate-400/10'
            } uppercase tracking-widest`}>
              {myRole}
            </span>
          )}
          <span className="ml-auto text-[#00c8ff]/50 text-[10px]">{time.toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border border-[#00c8ff]/20 bg-[#00c8ff]/5 p-4 rounded">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-3.5 h-3.5 text-[#00c8ff]/60" />
            <span className="text-[#00c8ff]/60 text-[9px] uppercase tracking-widest">Sales Performance</span>
          </div>
          <div className="text-3xl font-bold text-white">{paperReams.toLocaleString()}</div>
          <div className="text-[#00c8ff]/40 text-[9px] mt-1 uppercase tracking-widest">Reams Sold</div>
        </div>

        <div className="border border-[#00c8ff]/20 bg-[#00c8ff]/5 p-4 rounded">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-3.5 h-3.5 text-[#00c8ff]/60" />
            <span className="text-[#00c8ff]/60 text-[9px] uppercase tracking-widest">Focus Session</span>
          </div>
          {isTimerActive ? (
            <>
              <div className="text-3xl font-bold text-emerald-400">{formatTime(timeLeft)}</div>
              <div className="text-emerald-400/60 text-[9px] mt-1 uppercase tracking-widest">
                Active · +{sessionPaper} reams this session
              </div>
            </>
          ) : (
            <>
              <div className="text-3xl font-bold text-[#00c8ff]/30">--:--</div>
              <div className="text-[#00c8ff]/30 text-[9px] mt-1 uppercase tracking-widest">No active session</div>
            </>
          )}
        </div>
      </div>

      {(myRole === 'admin' || myRole === 'manager') && (
        <div className="border border-amber-400/30 bg-amber-400/5 p-4 rounded">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-3.5 h-3.5 text-amber-400/70" />
            <span className="text-amber-400/70 text-[9px] uppercase tracking-widest">Office Management</span>
          </div>
          <p className="text-[#00c8ff]/50 text-[10px] mb-4 leading-relaxed">
            Manage office members, assign roles, and configure workspace settings.
          </p>
          <button
            onClick={() => { onClose(); onOpenAdminPanel(); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 text-[10px] uppercase tracking-widest rounded transition-all"
          >
            <Settings className="w-3 h-3" />
            Manage Office
          </button>
        </div>
      )}
    </div>
  );
}

// ── Upgrades tab ─────────────────────────────────────────────────────────────
function UpgradesTab({ socket }: { socket: Socket | null }) {
  const user = useGameStore((s) => s.user);
  const paperReams = useGameStore((s) => s.paperReams);
  const chairLevelByEmail = useGameStore((s) => s.chairLevelByEmail);
  const monitorLevelByEmail = useGameStore((s) => s.monitorLevelByEmail);
  const setPaperReams = useGameStore((s) => s.setPaperReams);
  const patchChairLevel = useGameStore((s) => s.patchChairLevel);
  const patchMonitorLevel = useGameStore((s) => s.patchMonitorLevel);

  const myChairLevel = user?.email ? (chairLevelByEmail[user.email] ?? 0) : 0;
  const chairMaxed = myChairLevel >= CHAIR_UPGRADE_MAX_LEVEL;
  const canAffordChair = paperReams >= CHAIR_UPGRADE_COST_REAMS;

  const myMonitorLevel = user?.email ? (monitorLevelByEmail[user.email] ?? 0) : 0;
  const monitorMaxed = myMonitorLevel >= MONITOR_UPGRADE_MAX_LEVEL;
  const nextMonitorCost = monitorMaxed ? 0 : monitorUpgradeCostForNextLevel(myMonitorLevel);
  const canAffordMonitor = !monitorMaxed && paperReams >= nextMonitorCost;

  const socketOk = socket?.connected === true;

  const [chairBusy, setChairBusy] = useState(false);
  const [chairFeedback, setChairFeedback] = useState<string | null>(null);
  const [monitorBusy, setMonitorBusy] = useState(false);
  const [monitorFeedback, setMonitorFeedback] = useState<string | null>(null);

  const handleBuyChair = () => {
    setChairFeedback(null);
    if (!socketOk) { setChairFeedback('offline'); return; }
    if (chairMaxed) { setChairFeedback('max_level'); return; }
    if (!canAffordChair) { setChairFeedback('insufficient'); return; }
    setChairBusy(true);
    socket!.timeout(12_000).emit('purchaseChairUpgrade', (err: Error | null, res: unknown) => {
      setChairBusy(false);
      if (err) { setChairFeedback('server_error'); return; }
      const r = res as ChairPurchaseAck;
      if (!r || typeof r !== 'object') { setChairFeedback('server_error'); return; }
      if (r.ok) {
        setPaperReams(r.paperReams);
        if (user?.email) patchChairLevel(user.email, r.chairUpgradeLevel);
      } else {
        setChairFeedback((r as { ok: false; error: string }).error);
      }
    });
  };

  const handleBuyMonitor = () => {
    setMonitorFeedback(null);
    if (!socketOk) { setMonitorFeedback('offline'); return; }
    if (monitorMaxed) { setMonitorFeedback('max_level'); return; }
    if (!canAffordMonitor) { setMonitorFeedback('insufficient'); return; }
    setMonitorBusy(true);
    socket!.timeout(12_000).emit('purchaseMonitorUpgrade', (err: Error | null, res: unknown) => {
      setMonitorBusy(false);
      if (err) { setMonitorFeedback('server_error'); return; }
      const r = res as MonitorPurchaseAck;
      if (!r || typeof r !== 'object') { setMonitorFeedback('server_error'); return; }
      if (r.ok) {
        setPaperReams(r.paperReams);
        if (user?.email) patchMonitorLevel(user.email, r.monitorUpgradeLevel);
      } else {
        setMonitorFeedback((r as { ok: false; error: string }).error);
      }
    });
  };

  const feedbackMsg = (code: string | null) => {
    if (!code) return null;
    const map: Record<string, string> = {
      insufficient: 'Not enough reams.',
      max_level: 'Already at max level.',
      not_in_room: 'Join the office room first.',
      server_error: 'Could not complete — try again.',
      offline: 'Not connected.',
    };
    return map[code] ?? 'Unknown error.';
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[#00c8ff]/40 text-[10px] font-mono">Balance: <span className="text-amber-200">{paperReams.toLocaleString()}</span> reams</p>

      {/* Chair */}
      <div className="border border-amber-600/40 bg-amber-950/25 p-4 rounded">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <p className="text-amber-100 text-[10px] font-pixel mb-1">Desk Chair Upgrade</p>
            <p className="text-slate-400 text-[10px] leading-snug">
              Bigger seat, gold trim, studs &amp; plants — visible to everyone at your desk.
            </p>
            <p className="text-slate-500 text-[9px] mt-1">
              Seated focus: +{FOCUS_ENERGY_SEATED_REGEN_PER_CHAIR_LEVEL_PER_MIN}/min per level
              (max +{FOCUS_ENERGY_SEATED_REGEN_MAX_PER_MIN}/min at lv {CHAIR_UPGRADE_MAX_LEVEL})
            </p>
            <p className="text-amber-200 text-[9px] mt-1">Level {myChairLevel} / {CHAIR_UPGRADE_MAX_LEVEL}</p>
          </div>
          <span className="text-amber-300 text-sm shrink-0 font-mono">{CHAIR_UPGRADE_COST_REAMS} reams</span>
        </div>
        <button
          onClick={handleBuyChair}
          disabled={!socketOk || chairMaxed || chairBusy}
          className="pixel-button font-pixel text-[8px] w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {chairMaxed ? 'Chair fully upgraded' : chairBusy ? 'Processing…' : `Upgrade chair (${CHAIR_UPGRADE_COST_REAMS} reams)`}
        </button>
        {chairFeedback && <p className="text-rose-400/90 text-[10px] font-mono mt-2">{feedbackMsg(chairFeedback)}</p>}
      </div>

      {/* Monitor */}
      <div className="border border-cyan-700/40 bg-cyan-950/20 p-4 rounded">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <p className="text-cyan-100 text-[10px] font-pixel mb-1">Desk Monitors</p>
            <p className="text-slate-400 text-[10px] leading-snug">
              Add a screen each time (up to 8). First 3 upgrades also add +1 ream/min while focusing.
            </p>
            <p className="text-cyan-200 text-[9px] mt-1">
              {myMonitorLevel} / {MONITOR_UPGRADE_MAX_LEVEL} upgrades ({1 + myMonitorLevel} monitors)
              {!monitorMaxed && <span className="text-slate-500"> → next: {nextMonitorCost} reams</span>}
            </p>
          </div>
          {!monitorMaxed && <span className="text-cyan-300 text-sm shrink-0 font-mono">{nextMonitorCost} reams</span>}
        </div>
        <button
          onClick={handleBuyMonitor}
          disabled={!socketOk || monitorMaxed || monitorBusy}
          className="pixel-button font-pixel text-[8px] w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {monitorMaxed ? 'Monitors maxed (8 screens)' : monitorBusy ? 'Processing…' : `Add monitor (${nextMonitorCost} reams)`}
        </button>
        {monitorFeedback && <p className="text-rose-400/90 text-[10px] font-mono mt-2">{feedbackMsg(monitorFeedback)}</p>}
      </div>
    </div>
  );
}

// ── Desk Shop tab ─────────────────────────────────────────────────────────────
const DESK_W = 280; // px, SVG viewport
const DESK_H = 140; // px, SVG viewport

function DeskShopTab({ socket }: { socket: Socket | null }) {
  const user = useGameStore((s) => s.user);
  const paperReams = useGameStore((s) => s.paperReams);
  const deskItemsByEmail = useGameStore((s) => s.deskItemsByEmail);
  const setPaperReams = useGameStore((s) => s.setPaperReams);
  const patchDeskItems = useGameStore((s) => s.patchDeskItems);

  const myItems: DeskItemPlacement[] = user?.email ? (deskItemsByEmail[user.email] ?? []) : [];
  const socketOk = socket?.connected === true;

  const [buyFeedback, setBuyFeedback] = useState<Record<string, string>>({});
  const [buyBusy, setBuyBusy] = useState<Record<string, boolean>>({});

  // Rearrange state
  const [editItems, setEditItems] = useState<DeskItemPlacement[] | null>(null);
  const draggingIdx = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const activeItems = editItems ?? myItems;

  const handleBuy = (itemId: string, cost: number) => {
    setBuyFeedback((f) => ({ ...f, [itemId]: '' }));
    if (!socketOk) { setBuyFeedback((f) => ({ ...f, [itemId]: 'Not connected.' })); return; }
    if (paperReams < cost) { setBuyFeedback((f) => ({ ...f, [itemId]: 'Not enough reams.' })); return; }
    setBuyBusy((b) => ({ ...b, [itemId]: true }));
    socket!.timeout(12_000).emit('purchaseDeskItem', { itemId }, (err: Error | null, res: unknown) => {
      setBuyBusy((b) => ({ ...b, [itemId]: false }));
      if (err) { setBuyFeedback((f) => ({ ...f, [itemId]: 'Server error — try again.' })); return; }
      const r = res as DeskItemPurchaseAck;
      if (!r || typeof r !== 'object') { setBuyFeedback((f) => ({ ...f, [itemId]: 'Server error — try again.' })); return; }
      if (r.ok) {
        setPaperReams(r.paperReams);
        if (user?.email) patchDeskItems(user.email, r.items);
      } else {
        const msgs: Record<string, string> = {
          already_owned: 'Already owned.',
          insufficient: 'Not enough reams.',
          not_found: 'Item not found.',
          not_in_room: 'Join the office room first.',
          server_error: 'Server error — try again.',
        };
        const errCode = (r as { ok: false; error: string }).error;
        setBuyFeedback((f) => ({ ...f, [itemId]: msgs[errCode] ?? 'Unknown error.' }));
      }
    });
  };

  // ── SVG drag rearrange ──────────────────────────────────────────────────
  // Map desk local coords (-1..1 x, -0.4..0.4 z) to SVG px
  const toSvg = (x: number, z: number) => ({
    svgX: ((x + 1) / 2) * DESK_W,
    svgY: ((z + 0.4) / 0.8) * DESK_H,
  });
  const fromSvg = (svgX: number, svgY: number) => ({
    x: Math.max(-1, Math.min(1, (svgX / DESK_W) * 2 - 1)),
    z: Math.max(-0.4, Math.min(0.4, (svgY / DESK_H) * 0.8 - 0.4)),
  });

  const onSvgPointerDown = (e: React.PointerEvent<SVGCircleElement>, idx: number) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingIdx.current = idx;
    if (!editItems) setEditItems([...myItems]);
  };

  const onSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingIdx.current == null || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = e.clientX - rect.left;
    const svgY = e.clientY - rect.top;
    const { x, z } = fromSvg(svgX, svgY);
    setEditItems((prev) => {
      const base = prev ?? [...myItems];
      return base.map((item, i) => i === draggingIdx.current ? { ...item, x, z } : item);
    });
  };

  const onSvgPointerUp = () => {
    draggingIdx.current = null;
  };

  const handleSavePositions = () => {
    if (!editItems || !socketOk || !user?.email) return;
    socket!.timeout(8_000).emit('saveDeskItemPositions', { items: editItems }, (err: Error | null, res: unknown) => {
      if (!err && (res as { ok?: boolean })?.ok) {
        patchDeskItems(user.email!, editItems);
        setEditItems(null);
      }
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[#00c8ff]/40 text-[10px] font-mono">Balance: <span className="text-amber-200">{paperReams.toLocaleString()}</span> reams</p>

      {DESK_ITEM_CATALOG.filter((def) => def.shopVisible !== false).map((def) => {
        const owned = myItems.some((i) => i.id === def.id);
        const busy = buyBusy[def.id] ?? false;
        const fb = buyFeedback[def.id];
        return (
          <div key={def.id} className="border border-yellow-600/30 bg-yellow-950/20 p-4 rounded">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <p className="text-yellow-100 text-[10px] font-pixel mb-1">🏆 {def.name}</p>
                <p className="text-slate-400 text-[10px] leading-snug">{def.description}</p>
              </div>
              {!owned && <span className="text-yellow-300 text-sm shrink-0 font-mono">{def.cost} reams</span>}
              {owned && <span className="text-emerald-400 text-[9px] font-mono shrink-0 uppercase tracking-widest">Owned</span>}
            </div>
            {!owned && (
              <button
                onClick={() => handleBuy(def.id, def.cost)}
                disabled={!socketOk || busy || paperReams < def.cost}
                className="pixel-button font-pixel text-[8px] w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? 'Processing…' : `Buy (${def.cost} reams)`}
              </button>
            )}
            {fb && <p className="text-rose-400/90 text-[10px] font-mono mt-2">{fb}</p>}
          </div>
        );
      })}

      {/* Rearrange SVG */}
      {myItems.length > 0 && (
        <div className="border border-[#00c8ff]/20 bg-[#00c8ff]/5 p-4 rounded">
          <p className="text-[#00c8ff]/70 text-[9px] uppercase tracking-widest mb-3">Rearrange desk items</p>
          <p className="text-slate-500 text-[9px] mb-3">Drag items to reposition them on your desk surface.</p>
          <svg
            ref={svgRef}
            width={DESK_W}
            height={DESK_H}
            className="rounded border border-[#8B4513]/60 cursor-crosshair"
            style={{ background: '#5c2d0a', display: 'block', maxWidth: '100%' }}
            onPointerMove={onSvgPointerMove}
            onPointerUp={onSvgPointerUp}
            onPointerLeave={onSvgPointerUp}
          >
            {/* Desk surface grid lines */}
            <line x1={DESK_W / 2} y1={0} x2={DESK_W / 2} y2={DESK_H} stroke="#ffffff10" strokeWidth={1} />
            <line x1={0} y1={DESK_H / 2} x2={DESK_W} y2={DESK_H / 2} stroke="#ffffff10" strokeWidth={1} />
            {/* Items */}
            {activeItems.map((item, i) => {
              const def = DESK_ITEM_CATALOG.find((d) => d.id === item.id);
              const { svgX, svgY } = toSvg(item.x, item.z);
              return (
                <g key={item.id} transform={`translate(${svgX},${svgY})`}>
                  <circle
                    r={14}
                    fill="#FFD700"
                    stroke="#b8860b"
                    strokeWidth={2}
                    style={{ cursor: 'grab' }}
                    onPointerDown={(e) => onSvgPointerDown(e, i)}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={10}
                    fill="#1a0f00"
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {def?.name.slice(0, 3) ?? '?'}
                  </text>
                </g>
              );
            })}
          </svg>
          {editItems && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSavePositions}
                disabled={!socketOk}
                className="pixel-button font-pixel text-[8px] flex-1 disabled:opacity-50"
              >
                Save positions
              </button>
              <button
                onClick={() => setEditItems(null)}
                className="pixel-button font-pixel text-[8px] flex-1"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Company Perks tab ─────────────────────────────────────────────────────────
function PerksTab({ socket }: { socket: Socket | null }) {
  const user = useGameStore((s) => s.user);
  const paperReams = useGameStore((s) => s.paperReams);
  const teamUpgradePools = useGameStore((s) => s.teamUpgradePools);
  const setPaperReams = useGameStore((s) => s.setPaperReams);
  const patchTeamUpgradePool = useGameStore((s) => s.patchTeamUpgradePool);

  const socketOk = socket?.connected === true;
  const [contributions, setContributions] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const handleContribute = (upgradeType: string) => {
    const raw = contributions[upgradeType] ?? '';
    const amount = Math.floor(Number(raw));
    if (!amount || amount <= 0) { setFeedback((f) => ({ ...f, [upgradeType]: 'Enter a valid amount.' })); return; }
    if (!socketOk) { setFeedback((f) => ({ ...f, [upgradeType]: 'Not connected.' })); return; }
    if (paperReams < amount) { setFeedback((f) => ({ ...f, [upgradeType]: 'Not enough reams.' })); return; }
    setBusy((b) => ({ ...b, [upgradeType]: true }));
    setFeedback((f) => ({ ...f, [upgradeType]: '' }));
    socket!.timeout(12_000).emit(
      'contributeTeamUpgrade',
      { upgradeType, amount },
      (err: Error | null, res: unknown) => {
        setBusy((b) => ({ ...b, [upgradeType]: false }));
        if (err) { setFeedback((f) => ({ ...f, [upgradeType]: 'Server error — try again.' })); return; }
        const r = res as ContributeAck;
        if (!r || typeof r !== 'object') { setFeedback((f) => ({ ...f, [upgradeType]: 'Server error — try again.' })); return; }
        if (r.ok) {
          setPaperReams(r.paperReams);
          patchTeamUpgradePool(upgradeType, r.pool);
          setContributions((c) => ({ ...c, [upgradeType]: '' }));
        } else {
          const msgs: Record<string, string> = {
            insufficient: 'Not enough reams.',
            not_in_room: 'Join the office room first.',
            invalid: 'Invalid contribution.',
            server_error: 'Server error — try again.',
          };
          const errCode = (r as { ok: false; error: string }).error;
          setFeedback((f) => ({ ...f, [upgradeType]: msgs[errCode] ?? 'Unknown error.' }));
        }
      }
    );
  };

  const formatCountdown = (expiresAt: number) => {
    const ms = Math.max(0, expiresAt - Date.now());
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    return `${h}h ${m}m ${s}s`;
  };

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  void tick; // suppress unused warning — only used to trigger re-render for countdown

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[#00c8ff]/40 text-[10px] font-mono">
        Balance: <span className="text-amber-200">{paperReams.toLocaleString()}</span> reams
      </p>

      {Object.entries(TEAM_UPGRADE_DEFS).map(([upgradeType, def]) => {
        const pool = teamUpgradePools[upgradeType];
        const contributed = pool?.contributed ?? 0;
        const target = pool?.target ?? def.target;
        const expiresAt = pool?.expiresAt ?? null;
        const isActive = expiresAt != null && Date.now() < expiresAt;
        const progress = Math.min(1, contributed / target);
        const topContributors = pool
          ? Object.entries(pool.contributors)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
          : [];
        const myContrib = user?.email ? (pool?.contributors[user.email] ?? 0) : 0;

        return (
          <div key={upgradeType} className="border border-fuchsia-600/40 bg-fuchsia-950/20 p-4 rounded">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-fuchsia-100 text-[10px] font-pixel">{def.displayName}</p>
              {isActive && (
                <span className="text-emerald-400 text-[9px] font-mono shrink-0">Active</span>
              )}
            </div>
            <p className="text-slate-400 text-[10px] leading-snug mb-3">{def.description}</p>

            {isActive ? (
              <div className="space-y-1">
                <p className="text-emerald-400 text-[10px] font-mono">
                  Expires in: {formatCountdown(expiresAt!)}
                </p>
                <p className="text-slate-500 text-[9px]">
                  Contributions reset when the buff expires.
                </p>
              </div>
            ) : (
              <>
                {/* Progress bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-[9px] font-mono mb-1">
                    <span className="text-slate-400">{contributed.toLocaleString()} / {target.toLocaleString()} reams</span>
                    <span className="text-fuchsia-300">{Math.round(progress * 100)}%</span>
                  </div>
                  <div className="w-full h-2 bg-fuchsia-950/60 rounded overflow-hidden border border-fuchsia-800/40">
                    <div
                      className="h-full bg-fuchsia-500 transition-all"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                </div>

                {/* Top contributors */}
                {topContributors.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Contributors</p>
                    {topContributors.map(([email, amt]) => (
                      <p key={email} className="text-[9px] font-mono text-slate-400">
                        {email.split('@')[0]}: <span className="text-fuchsia-300">{amt.toLocaleString()}</span>
                      </p>
                    ))}
                  </div>
                )}
                {myContrib > 0 && (
                  <p className="text-[9px] font-mono text-slate-500 mb-3">Your contribution: <span className="text-fuchsia-300">{myContrib.toLocaleString()}</span></p>
                )}

                {/* Contribution input */}
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    max={paperReams}
                    value={contributions[upgradeType] ?? ''}
                    onChange={(e) => setContributions((c) => ({ ...c, [upgradeType]: e.target.value }))}
                    placeholder="Amount"
                    className="flex-1 bg-fuchsia-950/40 border border-fuchsia-700/40 text-white text-[10px] font-mono px-2 py-1 rounded focus:outline-none focus:border-fuchsia-400/60"
                  />
                  <button
                    onClick={() => handleContribute(upgradeType)}
                    disabled={!socketOk || (busy[upgradeType] ?? false)}
                    className="pixel-button font-pixel text-[8px] px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {busy[upgradeType] ? '…' : 'Contribute'}
                  </button>
                </div>
                {feedback[upgradeType] && (
                  <p className="text-rose-400/90 text-[10px] font-mono mt-2">{feedback[upgradeType]}</p>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export const ComputerInterface = ({ onClose, onOpenAdminPanel, socket }: ComputerInterfaceProps) => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'f' || e.key === 'F') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Monitor className="w-3.5 h-3.5" /> },
    { id: 'upgrades', label: 'Upgrades', icon: <Settings className="w-3.5 h-3.5" /> },
    { id: 'shop', label: 'Desk Shop', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
    { id: 'perks', label: 'Company Perks', icon: <Users className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/80">
      <div
        className="bg-[#1a1a2e] border-4 border-[#333] rounded-lg shadow-2xl w-[720px] max-h-[88vh] flex flex-col"
        style={{ boxShadow: '0 0 40px rgba(0,200,255,0.15), inset 0 0 60px rgba(0,0,0,0.5)' }}
      >
        {/* Scanline overlay */}
        <div
          className="absolute inset-0 pointer-events-none rounded-lg"
          style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)' }}
        />

        {/* Title bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#0d0d1a] border-b border-[#00c8ff]/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#00c8ff] animate-pulse" />
            <span className="text-[#00c8ff] text-xs font-mono tracking-widest uppercase">
              Dunder Mifflin Paper Co. — Employee Portal
            </span>
          </div>
          <button onClick={onClose} className="text-[#00c8ff]/60 hover:text-red-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-[#00c8ff]/20 bg-[#0d0d1a]/50 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest transition-colors ${
                activeTab === tab.id
                  ? 'text-[#00c8ff] border-b-2 border-[#00c8ff] bg-[#00c8ff]/5'
                  : 'text-[#00c8ff]/40 hover:text-[#00c8ff]/70'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6 font-mono">
          {activeTab === 'dashboard' && <DashboardTab onClose={onClose} onOpenAdminPanel={onOpenAdminPanel} />}
          {activeTab === 'upgrades' && <UpgradesTab socket={socket} />}
          {activeTab === 'shop' && <DeskShopTab socket={socket} />}
          {activeTab === 'perks' && <PerksTab socket={socket} />}
        </div>

        {/* Footer */}
        <div className="text-[#00c8ff]/20 text-[9px] text-center uppercase tracking-widest py-2 border-t border-[#00c8ff]/10 shrink-0">
          Press [F] or [Esc] to close
        </div>
      </div>
    </div>
  );
};
