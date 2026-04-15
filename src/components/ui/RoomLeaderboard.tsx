import React, { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { getDeterministicColor } from '../../constants';
import { RoomRole } from '../../types';

interface LeaderboardEntry {
  email: string;
  name: string | null;
  jobTitle?: string | null;
  role: RoomRole;
  totalReamsEarned: number;
}

interface RoomLeaderboardProps {
  roomId: string;
  onClose: () => void;
}

const RoleBadge = ({ role }: { role: RoomRole }) => (
  <span
    className="text-[6px] px-1 py-0.5 font-pixel shrink-0"
    style={{
      background: role === 'admin' ? '#fef3c7' : role === 'manager' ? '#ede9fe' : '#f1f5f9',
      color: role === 'admin' ? '#92400e' : role === 'manager' ? '#4c1d95' : '#334155',
      border: '1px solid rgba(0,0,0,0.25)',
      marginLeft: 4,
    }}
  >
    {role.toUpperCase()}
  </span>
);

/** Small deterministic pixel-art avatar: coloured square with initial. */
const PlayerAvatar = ({ email, name }: { email: string; name: string | null }) => {
  const colour = getDeterministicColor(email);
  const initial = (name ?? email)[0]?.toUpperCase() ?? '?';
  return (
    <div
      style={{
        width: 28,
        height: 28,
        background: colour,
        boxShadow: '0 -2px 0 0 #000, 0 2px 0 0 #000, -2px 0 0 0 #000, 2px 0 0 0 #000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: '#fff',
        fontSize: 10,
        fontFamily: 'var(--font-pixel)',
        textShadow: '1px 1px 0 rgba(0,0,0,0.4)',
      }}
    >
      {initial}
    </div>
  );
};

export const RoomLeaderboard = ({ roomId, onClose }: RoomLeaderboardProps) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUserEmail = useGameStore(s => s.user?.email);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/room/${roomId}/leaderboard`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setEntries(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [roomId]);

  const primaryName = (entry: LeaderboardEntry) =>
    entry.name ?? entry.email.split('@')[0];

  const maxReams = entries.length > 0
    ? Math.max(...entries.map(e => e.totalReamsEarned), 1)
    : 1;

  return (
    <div
      className="pixel-panel font-pixel overflow-hidden p-0 flex flex-col"
      style={{ width: 480, maxHeight: '80vh' }}
    >
      {/* Header */}
      <div className="px-5 py-3 shrink-0" style={{ background: 'var(--color-schrute)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white text-[8px] uppercase tracking-widest flex items-center gap-2">
              <Trophy className="w-3 h-3" />
              Employee Rankings
            </div>
            <div className="text-[7px] uppercase mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Total reams earned — all-time
            </div>
          </div>
          <button onClick={onClose} className="text-[10px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
            ✕
          </button>
        </div>
      </div>

      {/* Body — scrollable */}
      <div className="lined-paper overflow-y-auto flex-1 p-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <div
              className="w-5 h-5 border-2 animate-spin"
              style={{ borderColor: 'var(--color-schrute)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-[8px] text-center py-8" style={{ color: 'var(--color-ink-faint)' }}>
            No workers yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((entry, i) => {
              const isMe = entry.email === currentUserEmail;
              const barPct = maxReams > 0 ? (entry.totalReamsEarned / maxReams) * 100 : 0;
              const rankColour = i === 0 ? '#b45309' : i === 1 ? '#475569' : i === 2 ? '#92400e' : 'var(--color-ink-faint)';

              return (
                <div
                  key={entry.email}
                  className="flex flex-col gap-1.5 px-3 py-2"
                  style={isMe
                    ? { background: 'var(--color-legal)', border: '2px solid var(--color-ink)' }
                    : { background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.08)' }
                  }
                >
                  {/* Top row: rank + avatar + name/role + reams */}
                  <div className="flex items-center gap-2">
                    {/* Rank */}
                    <span
                      className="text-[10px] font-bold w-5 text-center shrink-0"
                      style={{ color: rankColour }}
                    >
                      {i === 0 ? '★' : i + 1}
                    </span>

                    {/* Avatar */}
                    <PlayerAvatar email={entry.email} name={entry.name} />

                    {/* Name + job + role */}
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="text-[8px] font-bold truncate"
                          style={{ color: 'var(--color-ink)' }}
                        >
                          {primaryName(entry)}
                        </span>
                        {isMe && (
                          <span className="text-[7px]" style={{ color: 'var(--color-beet)' }}>(you)</span>
                        )}
                        <RoleBadge role={entry.role} />
                      </div>
                      {entry.jobTitle && (
                        <span className="text-[7px] truncate" style={{ color: 'var(--color-ink-faint)' }}>
                          {entry.jobTitle}
                        </span>
                      )}
                    </div>

                    {/* Reams count */}
                    <div className="text-right shrink-0">
                      <div className="text-[8px] font-bold" style={{ color: 'var(--color-ink)' }}>
                        {entry.totalReamsEarned.toLocaleString()}
                      </div>
                      <div className="text-[7px]" style={{ color: 'var(--color-ink-faint)' }}>reams</div>
                    </div>
                  </div>

                  {/* Relative bar */}
                  <div
                    style={{
                      height: 6,
                      background: '#e8dfc8',
                      border: '1px solid rgba(0,0,0,0.12)',
                    }}
                  >
                    <div
                      style={{
                        width: `${barPct}%`,
                        height: '100%',
                        background: i === 0 ? '#b45309' : 'var(--color-schrute)',
                        transition: 'width 0.6s ease',
                        minWidth: barPct > 0 ? 4 : 0,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2 text-[7px] text-center shrink-0"
        style={{ borderTop: '2px solid var(--color-ink)', color: 'var(--color-ink-faint)' }}
      >
        DUNDER MIFFLIN PAPER CO.
      </div>
    </div>
  );
};
