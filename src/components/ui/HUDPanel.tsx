import React from 'react';
import { Users, Monitor, Coffee, Briefcase, LogOut, Layout, Shield } from 'lucide-react';
import { FocusEnergyBar } from './FocusEnergyBar';
import { RoomRole } from '../../types';

interface HUDPanelProps {
  playerCount: number;
  isConnected: boolean;
  currentRoom: string;
  paperReams: number;
  focusEnergy: number;
  onExitRoom: () => void;
  onCustomizeOffice: () => void;
  myRole?: RoomRole | null;
}

export const HUDPanel = ({
  playerCount,
  isConnected,
  currentRoom,
  paperReams,
  focusEnergy,
  onExitRoom,
  onCustomizeOffice,
  myRole,
}: HUDPanelProps) => (
  <div className="flex flex-col gap-4">
    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl shadow-2xl max-w-xs">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-indigo-500 p-2 rounded-lg">
          <Coffee className="text-white w-5 h-5" />
        </div>
        <h1 className="text-white font-bold text-xl tracking-tight">Schrute Space</h1>
      </div>

      <p className="text-slate-300 text-sm mb-6 leading-relaxed">
        Welcome to the Scranton branch. Explore the office, visit the beet farm, and meet your
        colleagues.
      </p>

      <div className="space-y-3">
        <FocusEnergyBar focusEnergy={focusEnergy} showDecayHint />
        <div className="flex items-center gap-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">
          <Briefcase className="w-4 h-4 text-amber-400" />
          <span>
            Paper Sold: <span className="text-white font-bold">{paperReams} reams</span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">
          <Users className="w-4 h-4" />
          <span>Active Employees: {playerCount}</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">
          <Monitor className="w-4 h-4" />
          <span>Status: {isConnected ? 'Online' : 'Connecting...'}</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">
          <Briefcase className="w-4 h-4" />
          <span>
            Room: <span className="text-indigo-400">{currentRoom}</span>
          </span>
        </div>
        {myRole && (
          <div className="flex items-center gap-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Role: <span className="text-white font-bold">{myRole}</span></span>
          </div>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-white/10 flex flex-col gap-2">
        <button
          onClick={onCustomizeOffice}
          className="w-full bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/50 text-amber-200 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
        >
          <Layout className="w-3 h-3" />
          Customize Office
        </button>
        <button
          onClick={onExitRoom}
          className="w-full bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/50 text-indigo-200 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
        >
          <LogOut className="w-3 h-3" />
          Exit Room
        </button>
      </div>
    </div>

    <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-4 rounded-xl">
      <h3 className="text-white/60 text-[10px] uppercase tracking-widest font-bold mb-2">
        Controls
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {[
          ['WASD', 'Move'],
          ['Mouse', 'Look'],
          ['Space', 'Jump'],
          ['Space x2', 'Dbl Jump'],
          ['W x2', 'Roll'],
          ['E', 'Focus'],
          ['F', 'Computer'],
        ].map(([key, label]) => (
          <div key={key} className="flex items-center gap-2 text-white/80 text-[10px]">
            <kbd className="bg-white/20 px-1.5 py-0.5 rounded border border-white/10">{key}</kbd>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);
