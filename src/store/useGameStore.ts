import { create } from 'zustand';

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
  setNearestDeskId: (id: string | null) => void;
  setChatFocused: (focused: boolean) => void;
  setOccupiedDeskIds: (ids: string[]) => void;
  setUser: (user: { id: string, email: string, name: string, picture: string } | null) => void;
}

export const useGameStore = create<GameState>((set) => ({
  paperReams: 0,
  addPaper: (amount) => set((state) => ({ paperReams: state.paperReams + amount })),
  setPaperReams: (count) => set({ paperReams: count }),

  isTimerActive: false,
  isTimerPaused: false,
  timerMode: 'focus',
  timeLeft: 25 * 60,
  startTimer: (mode) => set((state) => ({ 
    isTimerActive: true, 
    isTimerPaused: false,
    timerMode: mode, 
    timeLeft: mode === 'focus' ? 25 * 60 : 5 * 60,
    activeDeskId: state.nearestDeskId
  })),
  stopTimer: () => set({ isTimerActive: false, isTimerPaused: false, activeDeskId: null }),
  togglePause: () => set((state) => ({ isTimerPaused: !state.isTimerPaused })),
  tickTimer: () => set((state) => {
    if (state.isTimerPaused || !state.isTimerActive) return {};
    if (state.timeLeft <= 0) {
      return { isTimerActive: false, isTimerPaused: false, timeLeft: 0, activeDeskId: null };
    }
    
    const newTimeLeft = state.timeLeft - 1;
    let newPaperReams = state.paperReams;
    
    // Passive generation: 1 paper every 30 seconds during focus
    if (state.timerMode === 'focus' && (1500 - newTimeLeft) % 30 === 0 && newTimeLeft < 1500) {
      newPaperReams += 1;
    }

    return { timeLeft: newTimeLeft, paperReams: newPaperReams };
  }),
  resetTimer: () => set((state) => ({
    isTimerActive: false,
    isTimerPaused: false,
    timeLeft: state.timerMode === 'focus' ? 25 * 60 : 5 * 60,
    activeDeskId: null
  })),

  nearestDeskId: null,
  activeDeskId: null,
  isChatFocused: false,
  occupiedDeskIds: [],
  user: null,
  setNearestDeskId: (id) => set({ nearestDeskId: id }),
  setChatFocused: (focused) => set({ isChatFocused: focused }),
  setOccupiedDeskIds: (ids) => set({ occupiedDeskIds: ids }),
  setUser: (user) => set({ user }),
}));
