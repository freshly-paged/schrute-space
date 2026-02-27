import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  Stars, 
  Html,
  KeyboardControls
} from '@react-three/drei';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Monitor, Coffee, Briefcase, Info, MessageSquare, Send, LogOut } from 'lucide-react';

// Types & Constants
import { Player, ChatMessage } from './types';

// Components
import { LandingPage } from './components/ui/LandingPage';
import { OfficeEnvironment } from './components/world/OfficeEnvironment';
import { LocalPlayer } from './components/player/LocalPlayer';
import { OtherPlayer } from './components/player/OtherPlayer';
import { PomodoroUI } from './components/ui/PomodoroUI';
import { useGameStore } from './store/useGameStore';

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [currentRoom, setCurrentRoom] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('room');
    }
    return null;
  });
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [lastLocalMessage, setLastLocalMessage] = useState<{ text: string, time: number } | null>(null);
  const [user, setUser] = useState<{ email: string, name: string, picture?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [disconnectReason, setDisconnectReason] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const { isChatFocused, setChatFocused, isTimerActive, paperReams } = useGameStore();

  useEffect(() => {
    const checkAuth = async () => {
      console.log("Starting checkAuth...");
      try {
        const token = localStorage.getItem('office_auth_token');
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('/api/auth/me', { 
          headers,
          credentials: 'include' 
        });
        const data = await res.json();
        console.log("checkAuth response data:", data);
        if (data) {
          if (!user || data.email !== user.email) {
            console.log("Auth check: User found", data.email);
            setUser(data);
          }
        } else {
          console.log("checkAuth: No user found");
          setUser(null);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        console.log("checkAuth finished, setting authLoading to false");
        setAuthLoading(false);
      }
    };

    const handleMessage = (event: MessageEvent) => {
      console.log("Received message from popup:", event.data);
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        console.log("OAuth success detected via postMessage");
        if (event.data.token) {
          localStorage.setItem('office_auth_token', event.data.token);
        }
        checkAuth();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'office_auth_success' || e.key === 'office_auth_token') {
        console.log("OAuth success detected via localStorage");
        checkAuth();
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorage);
    
    // Initial check
    checkAuth();

    // Polling fallback while not logged in
    const interval = setInterval(() => {
      if (!user) checkAuth();
    }, 3000);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    if (!user || !currentRoom) return;

    const token = localStorage.getItem('office_auth_token');
    const newSocket = io({ 
      withCredentials: true,
      auth: { token },
      reconnectionAttempts: 5,
      timeout: 10000,
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      console.log('Connected to server successfully');
      newSocket.emit('joinRoom', { roomId: currentRoom });
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      setConnectionError(`Connection failed: ${err.message}`);
    });

    newSocket.on('forceDisconnect', (reason: string) => {
      setDisconnectReason(reason);
      newSocket.disconnect();
    });

    newSocket.on('currentPlayers', (serverPlayers: Record<string, Player>) => {
      const others = { ...serverPlayers };
      delete others[newSocket.id!];
      setPlayers(others);
    });

    newSocket.on('newPlayer', (player: Player) => {
      setPlayers((prev) => ({ ...prev, [player.id]: player }));
    });

    newSocket.on('playerMoved', (player: Player) => {
      setPlayers((prev) => ({ ...prev, [player.id]: player }));
    });

    newSocket.on('chatMessage', (message: ChatMessage) => {
      setChatHistory((prev) => [...prev.slice(-49), message]);
      
      if (message.playerId !== newSocket.id) {
        setPlayers((prev) => {
          if (prev[message.playerId]) {
            return {
              ...prev,
              [message.playerId]: {
                ...prev[message.playerId],
                lastMessage: message.text,
                lastMessageTime: message.time
              }
            };
          }
          return prev;
        });
      } else {
        setLastLocalMessage({ text: message.text, time: message.time });
      }
    });

    newSocket.on('playerDisconnected', (id: string) => {
      setPlayers((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user, currentRoom]);

  const handleExitRoom = () => {
    setCurrentRoom(null);
    window.location.search = '';
  };

  const handleJoin = (room: string) => {
    window.location.search = `?room=${room}`;
  };

  const handleLogin = async () => {
    try {
      const origin = window.location.origin;
      const res = await fetch(`/api/auth/google/url?origin=${encodeURIComponent(origin)}`, { credentials: 'include' });
      const { url } = await res.json();
      window.open(url, 'google_oauth', 'width=600,height=700');
    } catch (err) {
      console.error('Login failed', err);
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('office_auth_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    await fetch('/api/auth/logout', { 
      method: 'POST', 
      headers,
      credentials: 'include' 
    });
    localStorage.removeItem('office_auth_token');
    setUser(null);
    window.location.search = '';
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (chatInput.trim() && socket) {
      socket.emit('chatMessage', chatInput.trim());
      setChatInput('');
    }
  };

  const handleEmote = (emote: string) => {
    if (socket) {
      socket.emit('chatMessage', emote);
    }
  };

  const map = useMemo(() => [
    { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
    { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
    { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
    { name: 'right', keys: ['ArrowRight', 'KeyD'] },
    { name: 'jump', keys: ['Space'] },
    { name: 'interact', keys: ['KeyE'] },
  ], []);

  if (authLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-50">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

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

  if (!user) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-50 p-6">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-3xl shadow-2xl max-w-md text-center">
          <div className="bg-indigo-500 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <Coffee className="text-white w-10 h-10" />
          </div>
          <h2 className="text-white text-3xl font-black mb-4 tracking-tighter italic">Schrute Space</h2>
          <p className="text-slate-300 mb-8">Join the Scranton branch. Authenticate with your Gmail to enter the office.</p>
          <button 
            onClick={handleLogin}
            className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (!currentRoom) {
    return <LandingPage onJoin={handleJoin} userName={user.name} onLogout={handleLogout} />;
  }

  return (
    <div className="w-full h-screen bg-slate-900 overflow-hidden font-sans">
      {/* UI Overlay */}
      <AnimatePresence>
        {showUI && !isTimerActive && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-6 left-6 z-10 flex flex-col gap-4"
          >
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl shadow-2xl max-w-xs">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-indigo-500 p-2 rounded-lg">
                  <Coffee className="text-white w-5 h-5" />
                </div>
                <h1 className="text-white font-bold text-xl tracking-tight">Schrute Space</h1>
              </div>
              
              <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                Welcome to the Scranton branch. Explore the office, visit the beet farm, and meet your colleagues.
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">
                  <Briefcase className="w-4 h-4 text-amber-400" />
                  <span>Paper Sold: <span className="text-white font-bold">{paperReams} reams</span></span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">
                  <Users className="w-4 h-4" />
                  <span>Active Employees: {Object.keys(players).length + 1}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">
                  <Monitor className="w-4 h-4" />
                  <span>Status: {isConnected ? 'Online' : 'Connecting...'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">
                  <Briefcase className="w-4 h-4" />
                  <span>Room: <span className="text-indigo-400">{currentRoom}</span></span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/10">
                <button 
                  onClick={handleExitRoom}
                  className="w-full bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/50 text-indigo-200 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="w-3 h-3" />
                  Exit Room
                </button>
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-4 rounded-xl">
              <h3 className="text-white/60 text-[10px] uppercase tracking-widest font-bold mb-2">Controls</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="flex items-center gap-2 text-white/80 text-[10px]">
                  <kbd className="bg-white/20 px-1.5 py-0.5 rounded border border-white/10">WASD</kbd>
                  <span>Move</span>
                </div>
                <div className="flex items-center gap-2 text-white/80 text-[10px]">
                  <kbd className="bg-white/20 px-1.5 py-0.5 rounded border border-white/10">Mouse</kbd>
                  <span>Look</span>
                </div>
                <div className="flex items-center gap-2 text-white/80 text-[10px]">
                  <kbd className="bg-white/20 px-1.5 py-0.5 rounded border border-white/10">Space</kbd>
                  <span>Jump</span>
                </div>
                <div className="flex items-center gap-2 text-white/80 text-[10px]">
                  <kbd className="bg-white/20 px-1.5 py-0.5 rounded border border-white/10">Space x2</kbd>
                  <span>Dbl Jump</span>
                </div>
                <div className="flex items-center gap-2 text-white/80 text-[10px]">
                  <kbd className="bg-white/20 px-1.5 py-0.5 rounded border border-white/10">W x2</kbd>
                  <span>Roll</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PomodoroUI />

      <button 
        onClick={() => setShowUI(!showUI)}
        className="absolute bottom-6 right-6 z-10 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 p-3 rounded-full transition-all"
      >
        <Info className="text-white w-6 h-6" />
      </button>

      {/* Chat History Sidebar */}
      <AnimatePresence>
        {showUI && !isTimerActive && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-6 right-20 z-10 w-64 h-[calc(100vh-120px)] flex flex-col gap-4"
          >
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-2xl flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
                <MessageSquare className="text-indigo-400 w-4 h-4" />
                <h3 className="text-white font-bold text-xs uppercase tracking-widest">Chat Log</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {chatHistory.length === 0 && (
                  <p className="text-white/20 text-[10px] text-center mt-10 italic">No messages yet...</p>
                )}
                {chatHistory.map((msg) => (
                  <div key={msg.id} className="text-[10px]">
                    <span className="text-indigo-400 font-bold">{msg.playerName}: </span>
                    <span className="text-white/80">{msg.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Input */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-2xl shadow-2xl">
              <div className="flex gap-2 mb-2">
                {['👋', '😂', '👍', '🔥', '🏢', '🥬'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmote(emoji)}
                    className="hover:scale-125 transition-transform text-sm"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onFocus={() => setChatFocused(true)}
                  onBlur={() => setChatFocused(false)}
                  placeholder="Type a message..."
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 flex-1"
                />
                <button 
                  type="submit"
                  className="bg-indigo-500 hover:bg-indigo-600 text-white p-2 rounded-lg transition-colors"
                >
                  <Send className="w-3 h-3" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Scene */}
      <KeyboardControls map={map}>
        <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 2, 5], fov: 50 }}>
          <color attach="background" args={['#1e293b']} />
          <ambientLight intensity={0.7} />
          <directionalLight 
            position={[10, 10, 10]} 
            intensity={1.5} 
            castShadow 
            shadow-mapSize={[1024, 1024]}
          />
          <Suspense fallback={<Html center><div className="text-white font-pixel text-[8px] whitespace-nowrap">LOADING OFFICE...</div></Html>}>
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
          </Suspense>
        </Canvas>
      </KeyboardControls>

      {/* Loading State */}
      {!isConnected && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-indigo-400 font-mono text-sm tracking-widest uppercase mb-4">Connecting to Scranton...</p>
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
