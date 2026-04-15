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
    <div className="pixel-panel font-pixel w-[640px] max-h-[85vh] overflow-y-auto p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4" style={{ background: 'var(--color-schrute)' }}>
        <div className="flex items-center gap-2 text-white">
          <Settings className="w-4 h-4" />
          <h2 className="text-[8px] uppercase">Office Management</h2>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-5">
        {error && (
          <div
            className="pixel-border px-3 py-2 text-[8px] uppercase"
            style={{ background: '#fee2e2', color: 'var(--color-stamp-red)', border: '2px solid var(--color-stamp-red)' }}
          >
            {error}
          </div>
        )}

        {/* Members list */}
        <div>
          <h3 className="text-[8px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-ink-faint)' }}>
            Workers ({members.length}/{roomInfo?.maxWorkers ?? '?'})
          </h3>
          {members.length === 0 ? (
            <p className="text-[8px]" style={{ color: 'var(--color-ink-faint)' }}>No members yet.</p>
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
                      className="disabled:opacity-40 transition-colors"
                      style={{ color: 'var(--color-beet)' }}
                      title="Promote to Manager"
                    >
                      <ShieldPlus className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {m.role === 'manager' && myRole === 'admin' && (
                    <button
                      onClick={() => addMember(m.email, 'worker')}
                      disabled={loading}
                      className="disabled:opacity-40 transition-colors"
                      style={{ color: 'var(--color-ink-faint)' }}
                      title="Demote to Worker"
                    >
                      <ShieldMinus className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {m.role !== 'admin' && myRole !== 'worker' && (
                    <button
                      onClick={() => removeMember(m.email)}
                      disabled={loading}
                      className="disabled:opacity-40 transition-colors"
                      style={{ color: 'var(--color-stamp-red)' }}
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
            <h3 className="text-[8px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-ink-faint)' }}>Visitors Online</h3>
            <div className="flex flex-col gap-1.5">
              {visitors.map(v => (
                <div key={v.email} className="flex items-center gap-2 bg-white pixel-border px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-bold truncate" style={{ color: 'var(--color-ink)' }}>{displayName(v.email, v.name)}</div>
                    <div className="text-[8px] truncate" style={{ color: 'var(--color-ink-faint)' }}>{v.email}</div>
                  </div>
                  {myRole !== 'worker' && (
                    <button
                      onClick={() => addMember(v.email)}
                      disabled={loading}
                      className="disabled:opacity-40 transition-colors"
                      style={{ color: '#166534' }}
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
            <h3 className="text-[8px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-ink-faint)' }}>Add Worker by Email</h3>
            <div className="flex gap-2">
              <input
                value={addEmail}
                onChange={e => setAddEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && addEmail.trim()) addMember(addEmail.trim()); }}
                placeholder="user@example.com"
                className="pixel-input flex-1"
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
            <h3 className="text-[8px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-ink-faint)' }}>Max Workers</h3>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={1}
                max={100}
                value={maxWorkers}
                onChange={e => setMaxWorkers(Number(e.target.value))}
                className="pixel-input w-20"
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
            <h3 className="text-[8px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-ink-faint)' }}>New Employee Mode</h3>
            <div className="bg-white pixel-border px-3 py-2 text-[8px] flex items-center justify-between gap-3">
              <div className="flex-1" style={{ color: 'var(--color-ink)' }}>
                <div className="font-bold">Auto-hire new joiners</div>
                <div className="mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
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
                className="pixel-button text-[8px] disabled:opacity-50"
                style={allowNewEmployees ? { background: '#166534', padding: '6px 12px' } : { padding: '6px 12px' }}
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
