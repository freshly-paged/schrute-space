import React from 'react';
import { FocusEnergyBar } from './FocusEnergyBar';
import { RoomRole } from '../../types';

interface HUDPanelProps {
  playerCount: number;
  isConnected: boolean;
  currentRoom: string;
  paperReams: number;
  focusEnergy: number;
  myRole?: RoomRole | null;
}

export const HUDPanel = ({
  playerCount,
  isConnected,
  currentRoom,
  paperReams,
  focusEnergy,
  myRole,
}: HUDPanelProps) => (
  <div className="font-pixel">
    <div className="pixel-panel max-w-xs overflow-hidden">
      {/* Memo header band */}
      <div className="px-4 py-2" style={{ background: 'var(--color-schrute)' }}>
        <div className="text-white text-[8px] uppercase tracking-widest">DUNDER MIFFLIN</div>
        <div className="text-[7px] uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>
          Internal Memorandum
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Memo fields */}
        <div className="space-y-2 text-[8px]">
          <div className="flex gap-2">
            <span className="w-10 shrink-0" style={{ color: 'var(--color-ink-faint)' }}>TO:</span>
            <span style={{ color: 'var(--color-ink)' }}>{currentRoom} Branch</span>
          </div>
          <div className="flex gap-2">
            <span className="w-10 shrink-0" style={{ color: 'var(--color-ink-faint)' }}>RE:</span>
            <span style={{ color: 'var(--color-ink)' }}>Office Status Report</span>
          </div>
        </div>

        <hr className="memo-rule" />

        <FocusEnergyBar focusEnergy={focusEnergy} showDecayHint />

        <div className="space-y-2 text-[8px]">
          <div className="flex justify-between items-center">
            <span style={{ color: 'var(--color-ink-faint)' }}>PAPER SOLD</span>
            <span className="font-bold" style={{ color: 'var(--color-schrute)' }}>
              {paperReams} reams
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span style={{ color: 'var(--color-ink-faint)' }}>EMPLOYEES</span>
            <span style={{ color: 'var(--color-ink)' }}>{playerCount} on-site</span>
          </div>
          <div className="flex justify-between items-center">
            <span style={{ color: 'var(--color-ink-faint)' }}>STATUS</span>
            <span style={{ color: isConnected ? '#166534' : 'var(--color-stamp-red)' }}>
              {isConnected ? 'CONNECTED' : 'OFFLINE...'}
            </span>
          </div>
          {myRole && (
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--color-ink-faint)' }}>ROLE</span>
              <span className="font-bold uppercase" style={{ color: 'var(--color-beet)' }}>
                {myRole}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
