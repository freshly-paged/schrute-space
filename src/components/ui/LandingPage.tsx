import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AvatarConfig, DEFAULT_AVATAR_CONFIG, MyRoom } from '../../types';
import { AvatarPreview } from './AvatarPreview';

export const PixelBeet = () => (
  <div className="relative w-12 h-12 scale-75">
    <div className="absolute bottom-0 left-1/4 w-1/2 h-1/2 bg-[#7a0019] pixel-border"></div>
    <div className="absolute top-0 left-1/3 w-1/6 h-1/2 bg-[#2d5a27] pixel-border"></div>
    <div className="absolute top-1 left-1/2 w-1/6 h-1/3 bg-[#2d5a27] pixel-border"></div>
  </div>
);

interface LandingPageProps {
  onJoin: (room: string) => void;
  userName: string;
  onLogout: () => void;
  onCustomize: () => void;
  avatarConfig: AvatarConfig;
  paperReams: number;
}

export const LandingPage = ({ onJoin, userName, onLogout, onCustomize, avatarConfig, paperReams }: LandingPageProps) => {
  const [roomInput, setRoomInput] = useState('');
  const [myRooms, setMyRooms] = useState<MyRoom[]>([]);

  useEffect(() => {
    fetch('/api/my-rooms', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          console.log(`[landing] my-rooms loaded: ${d.length} room(s)`);
          setMyRooms(d);
        } else {
          console.warn('[landing] my-rooms unexpected response:', d);
        }
      })
      .catch((err) => console.error('[landing] my-rooms fetch failed:', err));
  }, []);

  return (
    <div className="min-h-screen bg-[#3d2b1f] flex flex-col items-center justify-center p-4 font-pixel text-white overflow-hidden">
      {/* Background Pixel Beets */}
      <div className="absolute inset-0 opacity-10 pointer-events-none grid grid-cols-6 gap-20 p-10">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="flex justify-center items-center">
            <PixelBeet />
          </div>
        ))}
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 bg-[#f0f0f0] p-8 md:p-10 pixel-border text-black max-w-3xl w-full"
      >
        {/* Header */}
        <div className="flex justify-center items-center gap-4 mb-8">
          <PixelBeet />
          <h1 className="text-2xl md:text-3xl uppercase">SCHRUTE SPACE</h1>
          <PixelBeet />
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Left: Employee card */}
          <div className="flex flex-col items-center gap-4 md:w-48 shrink-0">
            <div className="w-full bg-[#cbd5e1] pixel-border p-4 flex flex-col items-center gap-3">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest">EMPLOYEE</span>
              <div className="bg-white p-3 pixel-border">
                <AvatarPreview config={avatarConfig} width={80} height={112} />
              </div>
              <span className="text-[10px] text-indigo-900 font-bold uppercase text-center break-all">{userName}</span>
            </div>

            <div className="w-full bg-[#cbd5e1] pixel-border p-4 space-y-3">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest block">STATISTICS</span>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-600">PAPER SOLD</span>
                <span className="text-indigo-900 font-bold">{paperReams} reams</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onCustomize}
              className="w-full pixel-button text-[9px] py-2"
            >
              EDIT AVATAR
            </button>
          </div>

          {/* Right: Mission briefing + room join */}
          <div className="flex-1 flex flex-col justify-between gap-6">
            <div>
              <p className="text-[10px] md:text-xs leading-loose text-slate-600 mb-6">
                WELCOME BACK, <span className="text-indigo-600 font-bold uppercase">{userName}</span>.<br />
                IDENTITY THEFT IS NOT A JOKE, JIM.<br />
                BUT VIRTUAL COLLABORATION IS MANDATORY.
              </p>

              <div className="bg-[#cbd5e1] p-5 pixel-border text-left">
                <h2 className="text-xs mb-3 text-indigo-900">OFFICE DIRECTIVES:</h2>
                <ul className="text-[8px] space-y-2 text-slate-700">
                  <li>- HARVEST BEETS IN THE 3D FARM</li>
                  <li>- ATTEND MANDATORY MEETINGS</li>
                  <li>- DO NOT TOUCH DWIGHT'S STUFF</li>
                </ul>
              </div>
            </div>

            {myRooms.length > 0 && (
              <div className="bg-[#cbd5e1] p-4 pixel-border mb-2">
                <h2 className="text-xs mb-3 text-indigo-900">MY OFFICES:</h2>
                <div className="flex flex-col gap-2">
                  {myRooms.map(room => (
                    <button
                      key={room.roomId}
                      type="button"
                      onClick={() => onJoin(room.roomId)}
                      className="flex items-center justify-between w-full bg-white pixel-border px-3 py-2 hover:bg-indigo-50 transition-colors text-left"
                    >
                      <span className="text-[10px] font-bold text-indigo-900 uppercase">{room.roomId}</span>
                      <div className="flex items-center gap-2">
                        {room.onlineCount > 0 && (
                          <span className="text-[8px] text-emerald-600">{room.onlineCount} online</span>
                        )}
                        <span className={`text-[8px] px-2 py-0.5 pixel-border ${
                          room.role === 'admin' ? 'bg-amber-200 text-amber-900' :
                          room.role === 'manager' ? 'bg-indigo-200 text-indigo-900' :
                          'bg-slate-200 text-slate-700'
                        }`}>
                          {room.role.toUpperCase()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (roomInput.trim()) onJoin(roomInput.trim());
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <label className="text-[10px]">ENTER BRANCH CODE (ROOM ID):</label>
                <input
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value)}
                  placeholder="e.g. SCRANTON"
                  className="w-full bg-white border-4 border-black p-4 text-xs focus:outline-none focus:bg-yellow-50"
                />
              </div>
              <button
                type="submit"
                disabled={!roomInput.trim()}
                className="pixel-button text-xs py-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                JOIN OFFICE
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="text-[8px] text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest"
              >
                Sign out of {userName}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 text-[8px] text-slate-400 text-center">
          © 1765 SCHRUTE FARMS. ALL RIGHTS RESERVED.
        </div>
      </motion.div>
    </div>
  );
};
