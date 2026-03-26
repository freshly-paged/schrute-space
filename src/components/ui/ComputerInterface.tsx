import React, { useEffect, useState } from 'react';
import { X, Settings, FileText, Clock, Wifi } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

interface ComputerInterfaceProps {
  onClose: () => void;
  onOpenAdminPanel: () => void;
}

export const ComputerInterface = ({ onClose, onOpenAdminPanel }: ComputerInterfaceProps) => {
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'f' || e.key === 'F') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const displayName = user?.name ?? user?.email?.split('@')[0] ?? 'Employee';

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/80">
      {/* Monitor bezel */}
      <div className="bg-[#1a1a2e] border-4 border-[#333] rounded-lg shadow-2xl w-[700px] max-h-[85vh] overflow-hidden flex flex-col"
           style={{ boxShadow: '0 0 40px rgba(0,200,255,0.15), inset 0 0 60px rgba(0,0,0,0.5)' }}>

        {/* Screen scanline overlay */}
        <div className="absolute inset-0 pointer-events-none rounded-lg"
             style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)' }} />

        {/* Title bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#0d0d1a] border-b border-[#00c8ff]/30">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#00c8ff] animate-pulse" />
            <span className="text-[#00c8ff] text-xs font-mono tracking-widest uppercase">
              Dunder Mifflin Paper Co. — Employee Portal
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[#00c8ff]/50 text-[10px] font-mono">
              {time.toLocaleTimeString()}
            </span>
            <button onClick={onClose} className="text-[#00c8ff]/60 hover:text-red-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Screen content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 font-mono">

          {/* Welcome banner */}
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
            </div>
          </div>

          {/* Stats grid */}
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

          {/* Divider */}
          <div className="border-t border-[#00c8ff]/10" />

          {/* Admin section */}
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

          {/* Footer hint */}
          <div className="text-[#00c8ff]/20 text-[9px] text-center uppercase tracking-widest mt-auto">
            Press [F] or [Esc] to close
          </div>
        </div>
      </div>
    </div>
  );
};
