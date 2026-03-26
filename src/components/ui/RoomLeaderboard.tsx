import React, { useState, useEffect } from 'react';
import { X, Trophy } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { RoomRole } from '../../types';

interface LeaderboardEntry {
  email: string;
  name: string | null;
  role: RoomRole;
  paperReams: number;
}

interface RoomLeaderboardProps {
  roomId: string;
  onClose: () => void;
}

const RoleBadge = ({ role }: { role: RoomRole }) => (
  <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${
    role === 'admin' ? 'bg-amber-500/30 text-amber-300' :
    role === 'manager' ? 'bg-indigo-500/30 text-indigo-300' :
    'bg-slate-500/30 text-slate-300'
  }`}>
    {role.toUpperCase()}
  </span>
);

export const RoomLeaderboard = ({ roomId, onClose }: RoomLeaderboardProps) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUserEmail = useGameStore(s => s.user?.email);

  const fetchLeaderboard = () => {
    fetch(`/api/room/${roomId}/leaderboard`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          console.log(`[leaderboard] loaded ${data.length} entries for room=${roomId}`);
          setEntries(data);
        } else {
          console.warn('[leaderboard] unexpected response:', data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(`[leaderboard] fetch failed for room=${roomId}:`, err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 5 * 60_000);
    return () => clearInterval(interval);
  }, [roomId]);

  const displayName = (entry: LeaderboardEntry) =>
    entry.name ?? entry.email.split('@')[0];

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl w-72 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h2 className="text-white font-bold text-sm">Leaderboard</h2>
        </div>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white/80 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-slate-400 text-xs text-center py-6">No workers yet.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {entries.map((entry, i) => {
              const isMe = entry.email === currentUserEmail;
              return (
                <div
                  key={entry.email}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
                    isMe ? 'bg-indigo-500/20 border border-indigo-500/40' : 'bg-white/5'
                  }`}
                >
                  <span className={`text-sm font-bold w-5 text-center ${
                    i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-700' : 'text-slate-500'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-semibold truncate ${isMe ? 'text-indigo-200' : 'text-white'}`}>
                        {displayName(entry)}
                        {isMe && <span className="text-indigo-400 ml-1">(you)</span>}
                      </span>
                    </div>
                    <RoleBadge role={entry.role} />
                  </div>
                  <span className="text-xs font-bold text-white whitespace-nowrap">
                    {entry.paperReams.toLocaleString()} <span className="text-slate-400">reams</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-4 pb-3 text-[10px] text-slate-500 text-center">
        Updates every 60s
      </div>
    </div>
  );
};
