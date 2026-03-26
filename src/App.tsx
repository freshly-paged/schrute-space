import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars, Html, KeyboardControls } from '@react-three/drei';
import { motion, AnimatePresence } from 'motion/react';
import { Monitor, Info } from 'lucide-react';

import { useAuth } from './hooks/useAuth';
import { useSocket } from './hooks/useSocket';
import { useGameStore } from './store/useGameStore';

import { LandingPage } from './components/ui/LandingPage';
import { HUDPanel } from './components/ui/HUDPanel';
import { ChatPanel } from './components/ui/ChatPanel';
import { PomodoroUI } from './components/ui/PomodoroUI';
import { PaperBurst } from './components/ui/PaperBurst';
import { AvatarCustomizationPage } from './components/ui/AvatarCustomizationPage';
import { OfficeCustomizationPage } from './components/ui/OfficeCustomizationPage';
import { RoomLeaderboard } from './components/ui/RoomLeaderboard';
import { RoomAdminPanel } from './components/ui/RoomAdminPanel';
import { InspectOverlay } from './components/ui/InspectOverlay';
import { FurnitureItem } from './types';
import { OfficeEnvironment } from './components/world/OfficeEnvironment';
import { LocalPlayer } from './components/player/LocalPlayer';
import { OtherPlayer } from './components/player/OtherPlayer';

const KEYBOARD_MAP = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'interact', keys: ['KeyE'] },
  { name: 'drop', keys: ['KeyG'] },
];

function getRoomFromURL(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('room');
}

export default function App() {
  const { user, authLoading, logout } = useAuth();
  const [currentRoom, setCurrentRoom] = useState<string | null>(getRoomFromURL);
  const [showUI, setShowUI] = useState(true);

  const { socket, players, isConnected, chatHistory, lastLocalMessage, disconnectReason, connectionError, sendMessage } =
    useSocket(user, currentRoom);

  const { isTimerActive, paperReams, avatarConfig, setAvatarConfig, setPaperReams, roomLayout, setRoomLayout, roomInfo, showLeaderboard, setShowLeaderboard } = useGameStore();
  const [view, setView] = useState<'landing' | 'customize' | 'customize-office'>('landing');
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const keyboardMap = useMemo(() => KEYBOARD_MAP, []);

  const handleJoin = (room: string) => {
    localStorage.setItem('last_room', room);
    window.location.search = `?room=${room}`;
  };

  const handleExitRoom = () => {
    localStorage.removeItem('last_room');
    setCurrentRoom(null);
    setShowLeaderboard(false);
    setShowAdminPanel(false);
    window.location.search = '';
  };

  // Auto-redirect authenticated users to their last room
  useEffect(() => {
    if (user && !currentRoom) {
      const lastRoom = localStorage.getItem('last_room');
      if (lastRoom) {
        handleJoin(lastRoom);
      }
    }
  }, [user, currentRoom]);

  // Load player stats from DB when on landing page
  useEffect(() => {
    if (!user || currentRoom) return;
    fetch('/api/player', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.paperReams === 'number') setPaperReams(data.paperReams);
        if (data.avatarConfig) setAvatarConfig(data.avatarConfig);
      })
      .catch(() => {});
  }, [user, currentRoom]);

  const handleSaveOfficeLayout = useCallback(async (layout: FurnitureItem[]) => {
    setRoomLayout(layout);
    await fetch('/api/room-layout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ roomId: currentRoom, layout }),
    });
  }, [currentRoom, setRoomLayout]);

  const handleSaveAvatar = useCallback(async (config: typeof avatarConfig) => {
    setAvatarConfig(config);
    await fetch('/api/avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(config),
    });
    setView('landing');
  }, [setAvatarConfig]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-50">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Force-disconnected ───────────────────────────────────────────────────
  if (disconnectReason) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-50 p-6">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-3xl shadow-2xl max-w-md text-center">
          <div className="bg-red-500/20 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <Monitor className="text-red-400 w-10 h-10" />
          </div>
          <h2 className="text-white text-2xl font-bold mb-4">Session Disconnected</h2>
          <p className="text-slate-300 mb-8">{disconnectReason}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 rounded-xl transition-all"
          >
            Reconnect
          </button>
        </div>
      </div>
    );
  }

  // ── Not authenticated (IAP misconfigured or session missing) ────────────
  if (!user) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-50 p-6">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-3xl shadow-2xl max-w-md text-center">
          <div className="bg-red-500/20 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <Monitor className="text-red-400 w-10 h-10" />
          </div>
          <h2 className="text-white text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-slate-300 mb-8">Access is managed by Identity-Aware Proxy. Please ensure you are signed in.</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 rounded-xl transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Avatar customization ─────────────────────────────────────────────────
  if (!currentRoom && view === 'customize') {
    return (
      <AvatarCustomizationPage
        config={avatarConfig}
        onSave={handleSaveAvatar}
        onBack={() => setView('landing')}
      />
    );
  }

  // ── Office customization (in-room) ──────────────────────────────────────
  if (currentRoom && view === 'customize-office') {
    return (
      <OfficeCustomizationPage
        roomId={currentRoom}
        initialLayout={roomLayout}
        onBack={() => setView('landing')}
        onSave={handleSaveOfficeLayout}
      />
    );
  }

  // ── Room selection ───────────────────────────────────────────────────────
  if (!currentRoom) {
    return <LandingPage onJoin={handleJoin} userName={user.name} onLogout={logout} onCustomize={() => setView('customize')} avatarConfig={avatarConfig} paperReams={paperReams} />;
  }

  // ── Game ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-screen bg-slate-900 overflow-hidden font-sans">
      <AnimatePresence>
        {showUI && !isTimerActive && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-6 left-6 z-10"
          >
            <HUDPanel
              playerCount={Object.keys(players).length + 1}
              isConnected={isConnected}
              currentRoom={currentRoom}
              paperReams={paperReams}
              onExitRoom={handleExitRoom}
              onCustomizeOffice={() => setView('customize-office')}
              myRole={roomInfo?.myRole ?? null}
              onOpenAdminPanel={() => setShowAdminPanel(v => !v)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <PomodoroUI />
      <PaperBurst />
      <InspectOverlay />

      <button
        onClick={() => setShowUI((v) => !v)}
        className="absolute bottom-6 right-6 z-10 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 p-3 rounded-full transition-all"
      >
        <Info className="text-white w-6 h-6" />
      </button>


      <AnimatePresence>
        {showUI && !isTimerActive && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-6 right-20 z-10"
          >
            <ChatPanel chatHistory={chatHistory} onSendMessage={sendMessage} />
          </motion.div>
        )}
      </AnimatePresence>

      {showLeaderboard && currentRoom && (
        <div className="absolute top-6 right-[22rem] z-10">
          <RoomLeaderboard roomId={currentRoom} onClose={() => setShowLeaderboard(false)} />
        </div>
      )}

      {showAdminPanel && currentRoom && (roomInfo?.myRole === 'admin' || roomInfo?.myRole === 'manager') && (
        <div className="absolute top-48 left-6 z-10">
          <RoomAdminPanel roomId={currentRoom} onClose={() => setShowAdminPanel(false)} />
        </div>
      )}

      <KeyboardControls map={keyboardMap}>
        <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 2, 5], fov: 50 }}>
          <color attach="background" args={['#1e293b']} />
          <ambientLight intensity={0.7} />
          <directionalLight
            position={[10, 10, 10]}
            intensity={1.5}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <React.Suspense
            fallback={
              <Html center>
                <div className="text-white font-pixel text-[8px] whitespace-nowrap">
                  LOADING OFFICE...
                </div>
              </Html>
            }
          >
            <OfficeEnvironment />
            <LocalPlayer
              socket={socket}
              lastMessage={lastLocalMessage?.text}
              lastMessageTime={lastLocalMessage?.time}
              playerName={user.name}
              players={players}
            />
            {Object.values(players).map((player) => (
              <OtherPlayer key={player.id} player={player} />
            ))}
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          </React.Suspense>
        </Canvas>
      </KeyboardControls>

      {!isConnected && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-indigo-400 font-mono text-sm tracking-widest uppercase mb-4">
              Connecting to Scranton...
            </p>
            {connectionError && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
                <p className="text-red-400 text-xs font-bold mb-4">{connectionError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-red-500 hover:bg-red-600 text-white text-[10px] px-4 py-2 rounded-lg font-bold transition-all"
                >
                  Retry Connection
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
