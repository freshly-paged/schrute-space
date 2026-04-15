import React, { useState, useEffect } from 'react';
import { X, Settings, UserPlus, UserMinus, ShieldPlus, ShieldMinus, Wifi, WifiOff } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { RoomRole, RoomMember } from '../../types';

interface Visitor {
  email: string;
  name: string | null;
  isOnline: boolean;
}

interface RoomAdminPanelProps {
  roomId: string;
  onClose: () => void;
}

const RoleBadge = ({ role }: { role: RoomRole }) => (
  <span className={`text-[8px] px-1.5 py-0.5 font-pixel pixel-border ${
    role === 'admin' ? 'bg-amber-200 text-amber-900' :
    role === 'manager' ? 'bg-indigo-200 text-indigo-900' :
    'bg-slate-200 text-slate-700'
  }`}>
    {role.toUpperCase()}
  </span>
);

export const RoomAdminPanel = ({ roomId, onClose }: RoomAdminPanelProps) => {
  const roomInfo = useGameStore(s => s.roomInfo);
  const myRole = roomInfo?.myRole ?? null;

  const [members, setMembers] = useState<RoomMember[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [addEmail, setAddEmail] = useState('');
  const [maxWorkers, setMaxWorkers] = useState(roomInfo?.maxWorkers ?? 20);
  const [allowNewEmployees, setAllowNewEmployees] = useState(roomInfo?.allowNewEmployees ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = () => {
    fetch(`/api/room/${roomId}/members`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.members) {
          console.log(`[admin] members loaded: ${data.members.length} member(s), ${data.visitors?.length ?? 0} visitor(s) for room=${roomId}`);
          setMembers(data.members);
        }
        if (data.visitors) setVisitors(data.visitors);
      })
      .catch((err) => console.error(`[admin] fetchMembers failed for room=${roomId}:`, err));
  };

  useEffect(() => {
    fetchMembers();
  }, [roomId]);

  // Sync maxWorkers from store when it updates
  useEffect(() => {
    if (roomInfo?.maxWorkers !== undefined) setMaxWorkers(roomInfo.maxWorkers);
    if (roomInfo?.allowNewEmployees !== undefined) setAllowNewEmployees(roomInfo.allowNewEmployees);
  }, [roomInfo?.maxWorkers, roomInfo?.allowNewEmployees]);

  const addMember = async (email: string, role: RoomRole = 'worker') => {
    console.log(`[admin] adding member email=${email} role=${role} to room=${roomId}`);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/room/${roomId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to add member');
      console.log(`[admin] member added: ${email}`);
      setAddEmail('');
      fetchMembers();
    } catch (e: any) {
      console.error(`[admin] addMember failed:`, e.message);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (email: string) => {
    console.log(`[admin] removing member email=${email} from room=${roomId}`);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/room/${roomId}/members/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to remove member');
      console.log(`[admin] member removed: ${email}`);
      fetchMembers();
    } catch (e: any) {
      console.error(`[admin] removeMember failed:`, e.message);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const saveRoomSettings = async (patch: { maxWorkers?: number; allowNewEmployees?: boolean }) => {
    console.log(`[admin] saving room settings for room=${roomId}`, patch);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/room/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to update');
      console.log(`[admin] room settings updated`);
    } catch (e: any) {
      console.error(`[admin] saveRoomSettings failed:`, e.message);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const displayName = (email: string, name: string | null) =>
    name ?? email.split('@')[0];

  return (
    <div className="bg-[#f0f0f0] pixel-border font-pixel text-black w-[640px] max-h-[85vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b-4 border-black bg-[#cbd5e1]">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          <h2 className="text-xs uppercase font-bold">Office Management</h2>
        </div>
        <button onClick={onClose} className="hover:text-red-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-5">
        {error && (
          <div className="bg-red-100 pixel-border border-red-400 px-3 py-2 text-[9px] text-red-700 uppercase">
            {error}
          </div>
        )}

        {/* Members list */}
        <div>
          <h3 className="text-[9px] uppercase text-slate-500 tracking-widest mb-2">
            Workers ({members.length}/{roomInfo?.maxWorkers ?? '?'})
          </h3>
          {members.length === 0 ? (
            <p className="text-[9px] text-slate-400">No members yet.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {members.map(m => (
                <div key={m.email} className="flex items-center gap-2 bg-white pixel-border px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold truncate">{displayName(m.email, m.name)}</div>
                    {m.jobTitle ? (
                      <div className="text-[8px] text-slate-500 truncate">{m.jobTitle}</div>
                    ) : null}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <RoleBadge role={m.role} />
                      {m.isOnline
                        ? <Wifi className="w-2.5 h-2.5 text-emerald-500" />
                        : <WifiOff className="w-2.5 h-2.5 text-slate-400" />
                      }
                    </div>
                  </div>
                  {m.role === 'worker' && myRole === 'admin' && (
                    <button
                      onClick={() => addMember(m.email, 'manager')}
                      disabled={loading}
                      className="text-indigo-500 hover:text-indigo-700 disabled:opacity-40 transition-colors"
                      title="Promote to Manager"
                    >
                      <ShieldPlus className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {m.role === 'manager' && myRole === 'admin' && (
                    <button
                      onClick={() => addMember(m.email, 'worker')}
                      disabled={loading}
                      className="text-slate-500 hover:text-slate-700 disabled:opacity-40 transition-colors"
                      title="Demote to Worker"
                    >
                      <ShieldMinus className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {m.role !== 'admin' && myRole !== 'worker' && (
                    <button
                      onClick={() => removeMember(m.email)}
                      disabled={loading}
                      className="text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
                      title="Remove"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Online visitors */}
        {visitors.length > 0 && (
          <div>
            <h3 className="text-[9px] uppercase text-slate-500 tracking-widest mb-2">Visitors Online</h3>
            <div className="flex flex-col gap-1.5">
              {visitors.map(v => (
                <div key={v.email} className="flex items-center gap-2 bg-white pixel-border px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold truncate">{displayName(v.email, v.name)}</div>
                    <div className="text-[8px] text-slate-400 truncate">{v.email}</div>
                  </div>
                  {myRole !== 'worker' && (
                    <button
                      onClick={() => addMember(v.email)}
                      disabled={loading}
                      className="text-emerald-600 hover:text-emerald-800 disabled:opacity-40 transition-colors"
                      title="Hire as worker"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add by email */}
        {myRole !== 'worker' && (
          <div>
            <h3 className="text-[9px] uppercase text-slate-500 tracking-widest mb-2">Add Worker by Email</h3>
            <div className="flex gap-2">
              <input
                value={addEmail}
                onChange={e => setAddEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && addEmail.trim()) addMember(addEmail.trim()); }}
                placeholder="user@example.com"
                className="flex-1 bg-white border-4 border-black px-2 py-1.5 text-[9px] focus:outline-none focus:bg-yellow-50"
              />
              <button
                onClick={() => { if (addEmail.trim()) addMember(addEmail.trim()); }}
                disabled={loading || !addEmail.trim()}
                className="pixel-button text-[9px] px-3 py-1.5 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Max workers (admin only) */}
        {myRole === 'admin' && (
          <div>
            <h3 className="text-[9px] uppercase text-slate-500 tracking-widest mb-2">Max Workers</h3>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={1}
                max={100}
                value={maxWorkers}
                onChange={e => setMaxWorkers(Number(e.target.value))}
                className="w-20 bg-white border-4 border-black px-2 py-1.5 text-[9px] focus:outline-none focus:bg-yellow-50"
              />
              <button
                onClick={() => saveRoomSettings({ maxWorkers })}
                disabled={loading}
                className="pixel-button text-[9px] px-3 py-1.5 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {myRole === 'admin' && (
          <div>
            <h3 className="text-[9px] uppercase text-slate-500 tracking-widest mb-2">New Employee Mode</h3>
            <div className="bg-white pixel-border px-3 py-2 text-[9px] flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="font-bold">Auto-hire new joiners</div>
                <div className="text-slate-500 mt-0.5">
                  ON: newcomers become workers automatically and get a desk.
                </div>
              </div>
              <button
                onClick={() => {
                  const next = !allowNewEmployees;
                  setAllowNewEmployees(next);
                  void saveRoomSettings({ allowNewEmployees: next });
                }}
                disabled={loading}
                className={`pixel-button text-[9px] px-3 py-1.5 disabled:opacity-50 ${
                  allowNewEmployees ? 'bg-emerald-300' : ''
                }`}
              >
                {allowNewEmployees ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
