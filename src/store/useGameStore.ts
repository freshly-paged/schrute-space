import { create } from 'zustand';
import { AvatarConfig, DEFAULT_AVATAR_CONFIG, FurnitureItem, RoomInfo } from '../types';

interface GameState {
  // Paper Clicker State
  paperReams: number;
  addPaper: (amount: number) => void;
  setPaperReams: (count: number) => void;

  // Pomodoro State
  isTimerActive: boolean;
  isTimerPaused: boolean;
  timerMode: 'focus' | 'break';
  timeLeft: number; // in seconds
  sessionPaper: number; // paper earned in current focus session
  lastPaperEarnedAt: number; // timestamp — changes when paper is earned, triggers animation
  startTimer: (mode: 'focus' | 'break') => void;
  stopTimer: () => void;
  togglePause: () => void;
  tickTimer: () => void;
  resetTimer: () => void;

  // Interaction State
  nearestDeskId: string | null;
  activeDeskId: string | null;
  isChatFocused: boolean;
  occupiedDeskIds: string[];
  user: { id: string, email: string, name: string, picture: string } | null;
  avatarConfig: AvatarConfig;
  setNearestDeskId: (id: string | null) => void;
  setChatFocused: (focused: boolean) => void;
  setOccupiedDeskIds: (ids: string[]) => void;
  setUser: (user: { id: string, email: string, name: string, picture: string } | null) => void;
  setAvatarConfig: (config: AvatarConfig) => void;
  roomLayout: FurnitureItem[];
  setRoomLayout: (layout: FurnitureItem[]) => void;
  roomInfo: RoomInfo | null;
  setRoomInfo: (info: RoomInfo | null) => void;
}

export const useGameStore = create<GameState>((set) => ({
  paperReams: 0,
  addPaper: (amount) => set((state) => ({ paperReams: state.paperReams + amount })),
  setPaperReams: (count) => set({ paperReams: count }),

  isTimerActive: false,
  isTimerPaused: false,
  timerMode: 'focus',
  timeLeft: 25 * 60,
  sessionPaper: 0,
  lastPaperEarnedAt: 0,
  startTimer: (mode) => set((state) => ({
    isTimerActive: true,
    isTimerPaused: false,
    timerMode: mode,
    timeLeft: mode === 'focus' ? 25 * 60 : 5 * 60,
    activeDeskId: state.nearestDeskId,
    sessionPaper: 0,
    lastPaperEarnedAt: 0,
  })),
  stopTimer: () => set({ isTimerActive: false, isTimerPaused: false, activeDeskId: null, sessionPaper: 0 }),
  togglePause: () => set((state) => ({ isTimerPaused: !state.isTimerPaused })),
  tickTimer: () => set((state) => {
    if (state.isTimerPaused || !state.isTimerActive) return {};

    const newTimeLeft = state.timeLeft - 1;

    if (newTimeLeft <= 0) {
      return { isTimerActive: false, isTimerPaused: false, timeLeft: 0, activeDeskId: null };
    }

    let newPaperReams = state.paperReams;
    let newSessionPaper = state.sessionPaper;
    let newLastPaperEarnedAt = state.lastPaperEarnedAt;

    // Passive generation: 1 paper every 30 seconds during focus
    if (state.timerMode === 'focus' && (1500 - newTimeLeft) % 30 === 0 && newTimeLeft < 1500) {
      newPaperReams += 1;
      newSessionPaper += 1;
      newLastPaperEarnedAt = Date.now();
    }

    return { timeLeft: newTimeLeft, paperReams: newPaperReams, sessionPaper: newSessionPaper, lastPaperEarnedAt: newLastPaperEarnedAt };
  }),
  resetTimer: () => set((state) => ({
    isTimerActive: false,
    isTimerPaused: false,
    timeLeft: state.timerMode === 'focus' ? 25 * 60 : 5 * 60,
    activeDeskId: null,
    sessionPaper: 0,
  })),

  nearestDeskId: null,
  activeDeskId: null,
  isChatFocused: false,
  occupiedDeskIds: [],
  user: null,
  avatarConfig: (() => {
    try {
      const stored = localStorage.getItem('avatar_config');
      return stored ? { ...DEFAULT_AVATAR_CONFIG, ...JSON.parse(stored) } : DEFAULT_AVATAR_CONFIG;
    } catch {
      return DEFAULT_AVATAR_CONFIG;
    }
  })(),
  setNearestDeskId: (id) => set({ nearestDeskId: id }),
  setChatFocused: (focused) => set({ isChatFocused: focused }),
  setOccupiedDeskIds: (ids) => set({ occupiedDeskIds: ids }),
  setUser: (user) => set({ user }),
  setAvatarConfig: (config) => {
    localStorage.setItem('avatar_config', JSON.stringify(config));
    set({ avatarConfig: config });
  },
  roomLayout: [],
  setRoomLayout: (layout) => set({ roomLayout: layout }),
  roomInfo: null,
  setRoomInfo: (info) => set({ roomInfo: info }),
}));
