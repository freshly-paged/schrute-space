import React, { useState } from 'react';
import { motion } from 'motion/react';

export const PixelBeet = () => (
  <div className="relative w-12 h-12 scale-75">
    {/* Beet Root */}
    <div className="absolute bottom-0 left-1/4 w-1/2 h-1/2 bg-[#7a0019] pixel-border"></div>
    {/* Beet Leaves */}
    <div className="absolute top-0 left-1/3 w-1/6 h-1/2 bg-[#2d5a27] pixel-border"></div>
    <div className="absolute top-1 left-1/2 w-1/6 h-1/3 bg-[#2d5a27] pixel-border"></div>
  </div>
);

export const LandingPage = ({ onJoin, userName, onLogout, onCustomize }: { onJoin: (room: string) => void, userName: string, onLogout: () => void, onCustomize: () => void }) => {
  const [roomInput, setRoomInput] = useState('');

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
        className="relative z-10 bg-[#f0f0f0] p-8 md:p-12 pixel-border text-black max-w-2xl w-full text-center"
      >
        <div className="flex justify-center mb-6">
          <PixelBeet />
          <h1 className="text-2xl md:text-4xl ml-4 self-center uppercase">SCHRUTE SPACE</h1>
          <PixelBeet />
        </div>

        <p className="text-[10px] md:text-xs leading-loose mb-8 text-slate-600">
          WELCOME BACK, <span className="text-indigo-600 font-bold uppercase">{userName}</span>.<br/>
          IDENTITY THEFT IS NOT A JOKE, JIM.<br/>
          BUT VIRTUAL COLLABORATION IS MANDATORY.
        </p>

        <div className="bg-[#cbd5e1] p-6 mb-8 pixel-border text-left">
          <h2 className="text-xs mb-4 text-indigo-900">OFFICE DIRECTIVES:</h2>
          <ul className="text-[8px] space-y-2 text-slate-700">
            <li>- HARVEST BEETS IN THE 3D FARM</li>
            <li>- ATTEND MANDATORY MEETINGS</li>
            <li>- DO NOT TOUCH DWIGHT'S STUFF</li>
          </ul>
        </div>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (roomInput.trim()) {
              onJoin(roomInput.trim());
            }
          }}
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col gap-4 text-left">
            <div className="flex flex-col gap-2">
              <label className="text-[10px]">ENTER BRANCH CODE (ROOM ID):</label>
              <input 
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder="e.g. SCRANTON"
                className="w-full bg-white border-4 border-black p-4 text-xs focus:outline-none focus:bg-yellow-50"
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={!roomInput.trim()}
              className="pixel-button text-xs py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              JOIN OFFICE
            </button>
            <button
              type="button"
              onClick={onCustomize}
              className="pixel-button text-xs py-4 bg-[#cbd5e1] hover:bg-[#b0bec5] text-slate-700"
            >
              CUSTOMIZE AVATAR
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="text-[8px] text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest"
            >
              Sign out of {userName}
            </button>
          </div>
        </form>

        <div className="mt-8 text-[8px] text-slate-400">
          © 1765 SCHRUTE FARMS. ALL RIGHTS RESERVED.
        </div>
      </motion.div>
    </div>
  );
};
