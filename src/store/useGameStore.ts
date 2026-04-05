import { create } from 'zustand';
import { FOCUS_SIT_POSE_COUNT } from '../avatarFocusPoses';
import { MONITOR_UPGRADE_MAX_LEVEL, focusReamsPerMinute } from '../monitorUpgradeConstants';
import { AvatarConfig, DEFAULT_AVATAR_CONFIG, FurnitureItem, RoomInfo } from '../types';

interface GameState {
  // Throwable object system
  nearThrowableId: string | null;       // ID of the throwable the player is close enough to pick up
  heldObjectId: string | null;          // ID of the object the player is currently holding
  throwVelocity: [number, number, number]; // launch velocity set by LocalPlayer on throw
  setNearThrowable: (id: string | null) => void;
  pickUpObject: (id: string) => void;
  throwObject: (velocity: [number, number, number]) => void;
  dropObject: () => void;
  droppingObjectId: string | null;

  // Inspect mode
  inspectedObject: { id: string; label: string; description: string; assetKey: string } | null;
  openInspect: (data: { id: string; label: string; description: string; assetKey: string }) => void;
  closeInspect: () => void;

  // Paper Clicker State
  paperReams: number;
  addPaper: (amount: number) => void;
  setPaperReams: (count: number) => void;

  // Pomodoro State
  isTimerActive: boolean;
  isTimerPaused: boolean;
  timerMode: 'focus' | 'break';
  timeLeft: number; // in seconds
  /** Wall-clock end time for the running timer (null while paused). Keeps countdown accurate when the tab is backgrounded. */
  timerEndsAt: number | null;
  sessionPaper: number; // paper earned in current focus session
  lastPaperEarnedAt: number; // timestamp — changes when paper is earned, triggers animation
  /** Random seated leg preset index for the current focus session (set when focus starts). */
  focusSitPoseIndex: number;
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
  user: { email: string; name: string; picture?: string } | null;
  avatarConfig: AvatarConfig;
  /** After `/api/player`; null displayName means use auth `user.name` in UI. */
  playerProfileLoaded: boolean;
  playerProfileDisplayName: string | null;
  playerProfileJobTitle: string | null;
  setNearestDeskId: (id: string | null) => void;
  setChatFocused: (focused: boolean) => void;
  setOccupiedDeskIds: (ids: string[]) => void;
  setUser: (user: { email: string; name: string; picture?: string } | null) => void;
  setAvatarConfig: (config: AvatarConfig) => void;
  setPlayerProfileFromServer: (profile: {
    displayName: string | null;
    jobTitle: string | null;
  }) => void;
  roomLayout: FurnitureItem[];
  setRoomLayout: (layout: FurnitureItem[]) => void;
  /** Desk owner email → vending chair upgrade level (0–20); synced from server. */
  chairLevelByEmail: Record<string, number>;
  setDeskChairLevels: (map: Record<string, number>) => void;
  patchChairLevel: (email: string, level: number) => void;
  resetChairLevels: () => void;
  /** Desk owner email → monitor upgrade count (0–7); synced from server. */
  monitorLevelByEmail: Record<string, number>;
  setDeskMonitorLevels: (map: Record<string, number>) => void;
  patchMonitorLevel: (email: string, level: number) => void;
  resetMonitorLevels: () => void;
  roomInfo: RoomInfo | null;
  setRoomInfo: (info: RoomInfo | null) => void;

  nearWhiteboard: boolean;
  setNearWhiteboard: (near: boolean) => void;

  nearWaterCooler: boolean;
  setNearWaterCooler: (near: boolean) => void;
  /** Local-only UI: epoch ms when water cooler buff ends (5 min from last enter). */
  waterBuffExpiresAt: number | null;
  setWaterBuffExpiresAt: (expiresAt: number | null) => void;
  showLeaderboard: boolean;
  setShowLeaderboard: (show: boolean) => void;

  showAdminPanel: boolean;
  setShowAdminPanel: (show: boolean) => void;
  showComputerInterface: boolean;
  setShowComputerInterface: (show: boolean) => void;

  nearVendingMachine: boolean;
  setNearVendingMachine: (near: boolean) => void;
  showVendingMenu: boolean;
  setShowVendingMenu: (show: boolean) => void;

  /** Local Vend-O-Matic treat; cleared when `expiresAt` passes (see LocalPlayer). */
  heldIceCream: { flavorIndex: number; expiresAt: number } | null;
  setHeldIceCream: (value: { flavorIndex: number; expiresAt: number } | null) => void;

  /** Local-only: throwable prop id currently worn on the avatar (upper body). */
  wornPropId: string | null;
  wearHeldProp: (id: string) => void;
  clearWornProp: () => void;

  /** Prop ids worn by *other* players — hides world copies of those throwables. */
  remoteWornThrowableIds: string[];
  setRemoteWornThrowableIds: (ids: string[]) => void;

  /** Throwable ids held by *other* players — hides world copies; used for remote held mesh. */
  remoteHeldThrowableIds: string[];
  setRemoteHeldThrowableIds: (ids: string[]) => void;

  /** Last known rest pose for a throwable (synced when someone drops / removes wear). */
  throwableRest: Partial<
    Record<string, { position: [number, number, number]; rotation: [number, number, number] }>
  >;
  setThrowableRest: (
    id: string,
    position: [number, number, number],
    rotation: [number, number, number]
  ) => void;
}

export const useGameStore = create<GameState>((set) => ({
  nearThrowableId: null,
  heldObjectId: null,
  throwVelocity: [0, 0, 0],
  droppingObjectId: null,
  setNearThrowable: (id) => set({ nearThrowableId: id }),
  pickUpObject: (id) => set({ heldObjectId: id, nearThrowableId: null }),
  throwObject: (velocity) => set({ heldObjectId: null, throwVelocity: velocity, droppingObjectId: null }),
  dropObject: () => set((s) => ({ heldObjectId: null, droppingObjectId: s.heldObjectId })),

  inspectedObject: null,
  openInspect: (data) => set({ inspectedObject: data, nearThrowableId: null }),
  closeInspect: () => set({ inspectedObject: null }),

  paperReams: 0,
  addPaper: (amount) => set((state) => ({ paperReams: state.paperReams + amount })),
  setPaperReams: (count) => set({ paperReams: count }),

  isTimerActive: false,
  isTimerPaused: false,
  timerMode: 'focus',
  timeLeft: 25 * 60,
  timerEndsAt: null,
  sessionPaper: 0,
  lastPaperEarnedAt: 0,
  focusSitPoseIndex: 0,
  startTimer: (mode) =>
    set((state) => {
      const durationSec = mode === 'focus' ? 25 * 60 : 5 * 60;
      const now = Date.now();
      return {
        isTimerActive: true,
        isTimerPaused: false,
        timerMode: mode,
        timeLeft: durationSec,
        timerEndsAt: now + durationSec * 1000,
        activeDeskId: state.nearestDeskId,
        sessionPaper: 0,
        lastPaperEarnedAt: 0,
        focusSitPoseIndex:
          mode === 'focus' ? Math.floor(Math.random() * FOCUS_SIT_POSE_COUNT) : state.focusSitPoseIndex,
      };
    }),
  stopTimer: () =>
    set({
      isTimerActive: false,
      isTimerPaused: false,
      activeDeskId: null,
      sessionPaper: 0,
      focusSitPoseIndex: 0,
      timerEndsAt: null,
    }),
  togglePause: () =>
    set((state) => {
      if (!state.isTimerActive) return {};
      const nextPaused = !state.isTimerPaused;
      if (nextPaused) {
        return { isTimerPaused: true, timerEndsAt: null };
      }
      return {
        isTimerPaused: false,
        timerEndsAt: Date.now() + state.timeLeft * 1000,
      };
    }),
  tickTimer: () => set((state) => {
    if (state.isTimerPaused || !state.isTimerActive) return {};

    const endsAt = state.timerEndsAt ?? Date.now() + state.timeLeft * 1000;
    const newTimeLeft = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));

    if (newTimeLeft <= 0) {
      return {
        isTimerActive: false,
        isTimerPaused: false,
        timeLeft: 0,
        activeDeskId: null,
        focusSitPoseIndex: 0,
        timerEndsAt: null,
      };
    }

    let newPaperReams = state.paperReams;
    let newSessionPaper = state.sessionPaper;
    let newLastPaperEarnedAt = state.lastPaperEarnedAt;

    // Passive generation during focus: wall-clock based; rate scales with monitor upgrades (first 3 levels).
    if (state.timerMode === 'focus') {
      const elapsed = 1500 - newTimeLeft;
      const email = state.user?.email;
      const rawLv =
        email !== undefined ? (state.monitorLevelByEmail[email] ?? 0) : 0;
      const monitorLv = Math.min(
        MONITOR_UPGRADE_MAX_LEVEL,
        Math.max(0, Math.floor(rawLv))
      );
      const reamsPerMin = focusReamsPerMinute(monitorLv);
      const targetSessionPaper = Math.floor((elapsed * reamsPerMin) / 60);
      const paperDelta = targetSessionPaper - state.sessionPaper;
      if (paperDelta > 0) {
        newPaperReams += paperDelta;
        newSessionPaper = targetSessionPaper;
        newLastPaperEarnedAt = Date.now();
      }
    }

    return {
      timeLeft: newTimeLeft,
      timerEndsAt: endsAt,
      paperReams: newPaperReams,
      sessionPaper: newSessionPaper,
      lastPaperEarnedAt: newLastPaperEarnedAt,
    };
  }),
  resetTimer: () =>
    set((state) => ({
      isTimerActive: false,
      isTimerPaused: false,
      timeLeft: state.timerMode === 'focus' ? 25 * 60 : 5 * 60,
      activeDeskId: null,
      sessionPaper: 0,
      focusSitPoseIndex: 0,
      timerEndsAt: null,
    })),

  nearestDeskId: null,
  activeDeskId: null,
  isChatFocused: false,
  occupiedDeskIds: [],
  user: null,
  playerProfileLoaded: false,
  playerProfileDisplayName: null,
  playerProfileJobTitle: null,
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
  setPlayerProfileFromServer: (profile) =>
    set({
      playerProfileLoaded: true,
      playerProfileDisplayName: profile.displayName,
      playerProfileJobTitle: profile.jobTitle,
    }),
  setAvatarConfig: (config) => {
    localStorage.setItem('avatar_config', JSON.stringify(config));
    set({ avatarConfig: config });
  },
  roomLayout: [],
  setRoomLayout: (layout) => set({ roomLayout: layout }),
  chairLevelByEmail: {},
  setDeskChairLevels: (map) =>
    set((s) => ({ chairLevelByEmail: { ...s.chairLevelByEmail, ...map } })),
  patchChairLevel: (email, level) =>
    set((s) => ({
      chairLevelByEmail: { ...s.chairLevelByEmail, [email]: level },
    })),
  resetChairLevels: () => set({ chairLevelByEmail: {} }),
  monitorLevelByEmail: {},
  setDeskMonitorLevels: (map) =>
    set((s) => ({ monitorLevelByEmail: { ...s.monitorLevelByEmail, ...map } })),
  patchMonitorLevel: (email, level) =>
    set((s) => ({
      monitorLevelByEmail: { ...s.monitorLevelByEmail, [email]: level },
    })),
  resetMonitorLevels: () => set({ monitorLevelByEmail: {} }),
  roomInfo: null,
  setRoomInfo: (info) => set({ roomInfo: info }),

  nearWhiteboard: false,
  setNearWhiteboard: (near) => set({ nearWhiteboard: near }),

  nearWaterCooler: false,
  setNearWaterCooler: (near) => set({ nearWaterCooler: near }),
  waterBuffExpiresAt: null,
  setWaterBuffExpiresAt: (expiresAt) => set({ waterBuffExpiresAt: expiresAt }),
  showLeaderboard: false,
  setShowLeaderboard: (show) => set({ showLeaderboard: show }),

  showAdminPanel: false,
  setShowAdminPanel: (show) => set({ showAdminPanel: show }),
  showComputerInterface: false,
  setShowComputerInterface: (show) => set({ showComputerInterface: show }),

  nearVendingMachine: false,
  setNearVendingMachine: (near) => set({ nearVendingMachine: near }),
  showVendingMenu: false,
  setShowVendingMenu: (show) => set({ showVendingMenu: show }),

  heldIceCream: null,
  setHeldIceCream: (value) => set({ heldIceCream: value }),

  wornPropId: null,
  wearHeldProp: (id) => set({ wornPropId: id, heldObjectId: null, nearThrowableId: null }),
  clearWornProp: () => set({ wornPropId: null }),

  remoteWornThrowableIds: [],
  setRemoteWornThrowableIds: (ids) => set({ remoteWornThrowableIds: ids }),

  remoteHeldThrowableIds: [],
  setRemoteHeldThrowableIds: (ids) => set({ remoteHeldThrowableIds: ids }),

  throwableRest: {},
  setThrowableRest: (id, position, rotation) =>
    set((s) => ({
      throwableRest: { ...s.throwableRest, [id]: { position, rotation } },
    })),
}));
