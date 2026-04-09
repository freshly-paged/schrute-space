import { create } from 'zustand';
import { FOCUS_SIT_POSE_COUNT } from '../avatarFocusPoses';
import {
  clampFocusEnergy,
  focusReamMultiplier,
  FOCUS_ENERGY_WATER_BUFF_REGEN_PER_MIN,
  settleFocusEnergy,
  waterBuffOverlapMinutes,
} from '../focusEnergyModel';
import { CHAIR_UPGRADE_MAX_LEVEL } from '../chairUpgradeConstants';
import { MONITOR_UPGRADE_MAX_LEVEL, focusReamsPerMinute } from '../monitorUpgradeConstants';
import {
  POMODORO_FOCUS_DURATION_SEC,
  POMODORO_BREAK_DURATION_SEC,
  TEAM_PYRAMID_FOCUS_REAM_MULTIPLIER,
} from '../gameConfig';
import { getEffectiveDeskUpgradeEmail } from '../deskOwner';
import { AvatarConfig, DEFAULT_AVATAR_CONFIG, FurnitureItem, RoomInfo } from '../types';

export type InspectPreviewKind = 'model' | 'pyramid';

export type InspectedObjectData = {
  id: string;
  label: string;
  description: string;
  assetKey: string;
  linkUrl?: string;
  linkLabel?: string;
  secondaryLinkUrl?: string;
  secondaryLinkLabel?: string;
  previewKind?: InspectPreviewKind;
};

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
  inspectedObject: InspectedObjectData | null;
  openInspect: (data: InspectedObjectData) => void;
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
  /** Fractional reams carried between integer grants during focus (energy-scaled rate). */
  sessionPaperAccruedFloat: number;
  /** Wall-clock anchor for focus-session paper accrual. */
  lastFocusPaperTickAt: number;
  /** Random seated leg preset index for the current focus session (set when focus starts). */
  focusSitPoseIndex: number;
  /** Focus-only low-power UI toggle; auto-disabled outside active focus sessions. */
  focusSavingModeEnabled: boolean;
  startTimer: (mode: 'focus' | 'break') => void;
  stopTimer: () => void;
  togglePause: () => void;
  setFocusSavingModeEnabled: (enabled: boolean) => void;
  toggleFocusSavingMode: () => void;
  tickTimer: () => void;
  resetTimer: () => void;

  /** Desk focus stamina (0–100); synced from server, advanced locally by wall clock. */
  focusEnergy: number;
  /** Last wall-clock sample for local energy ticks (ms). */
  focusEnergyLastTickAt: number;
  setFocusEnergy: (value: number) => void;
  tickFocusEnergyWallClock: () => void;
  /** Instant spend (e.g. parkour). Returns false if not enough energy. */
  consumeFocusEnergy: (amount: number) => boolean;
  /** Epoch ms until which to show “insufficient energy for parkour” UI. */
  parkourEnergyHintUntil: number;
  flashParkourEnergyInsufficientHint: () => void;

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
  /** Local-only: epoch ms when water cooler buff ends (extra focus regen while window overlaps wall-clock ticks). */
  waterBuffExpiresAt: number | null;
  setWaterBuffExpiresAt: (expiresAt: number | null) => void;

  /** Server-synced: epoch ms when room Team Pyramid buff ends (null = inactive). */
  teamPyramidBuffExpiresAt: number | null;
  setTeamPyramidBuffExpiresAt: (expiresAt: number | null) => void;
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

  /** Local Vend-O-Matic treat; cleared when `expiresAt` passes or quarters reach 0 (see LocalPlayer). */
  heldIceCream: { flavorIndex: number; expiresAt: number; remainingQuarters: number } | null;
  setHeldIceCream: (value: { flavorIndex: number; expiresAt: number; remainingQuarters: number } | null) => void;

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

export const useGameStore = create<GameState>((set, get) => ({
  nearThrowableId: null,
  heldObjectId: null,
  throwVelocity: [0, 0, 0],
  droppingObjectId: null,
  setNearThrowable: (id) => set({ nearThrowableId: id }),
  pickUpObject: (id) => set({ heldObjectId: id, nearThrowableId: null }),
  throwObject: (velocity) => set({ heldObjectId: null, throwVelocity: velocity, droppingObjectId: null }),
  dropObject: () => set((s) => ({ heldObjectId: null, droppingObjectId: s.heldObjectId })),

  inspectedObject: null,
  openInspect: (data) =>
    set({
      inspectedObject: { previewKind: 'model', ...data },
      nearThrowableId: null,
    }),
  closeInspect: () => set({ inspectedObject: null }),

  paperReams: 0,
  addPaper: (amount) => set((state) => ({ paperReams: state.paperReams + amount })),
  setPaperReams: (count) => set({ paperReams: count }),

  isTimerActive: false,
  isTimerPaused: false,
  timerMode: 'focus',
  timeLeft: POMODORO_FOCUS_DURATION_SEC,
  timerEndsAt: null,
  sessionPaper: 0,
  lastPaperEarnedAt: 0,
  sessionPaperAccruedFloat: 0,
  lastFocusPaperTickAt: 0,
  focusSitPoseIndex: 0,
  focusSavingModeEnabled: false,
  startTimer: (mode) =>
    set((state) => {
      const durationSec = mode === 'focus' ? POMODORO_FOCUS_DURATION_SEC : POMODORO_BREAK_DURATION_SEC;
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
        sessionPaperAccruedFloat: 0,
        lastFocusPaperTickAt: mode === 'focus' ? now : 0,
        focusSitPoseIndex:
          mode === 'focus' ? Math.floor(Math.random() * FOCUS_SIT_POSE_COUNT) : state.focusSitPoseIndex,
        focusSavingModeEnabled: false,
      };
    }),
  stopTimer: () =>
    set({
      isTimerActive: false,
      isTimerPaused: false,
      activeDeskId: null,
      sessionPaper: 0,
      sessionPaperAccruedFloat: 0,
      lastFocusPaperTickAt: 0,
      focusSitPoseIndex: 0,
      focusSavingModeEnabled: false,
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
        lastFocusPaperTickAt: Date.now(),
      };
    }),
  setFocusSavingModeEnabled: (enabled) =>
    set((state) => {
      const inFocusSession = state.isTimerActive && state.timerMode === 'focus';
      return { focusSavingModeEnabled: inFocusSession ? enabled : false };
    }),
  toggleFocusSavingMode: () =>
    set((state) => {
      const inFocusSession = state.isTimerActive && state.timerMode === 'focus';
      return { focusSavingModeEnabled: inFocusSession ? !state.focusSavingModeEnabled : false };
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
        focusSavingModeEnabled: false,
        timerEndsAt: null,
        sessionPaperAccruedFloat: 0,
        lastFocusPaperTickAt: 0,
      };
    }

    let newPaperReams = state.paperReams;
    let newSessionPaper = state.sessionPaper;
    let newLastPaperEarnedAt = state.lastPaperEarnedAt;
    let newAccruedFloat = state.sessionPaperAccruedFloat;
    let newLastPaperTick = state.lastFocusPaperTickAt;

    // Passive generation during focus: dt-based; rate scales with monitors and current focus energy.
    if (state.timerMode === 'focus') {
      const now = Date.now();
      const upgradeEmail = getEffectiveDeskUpgradeEmail(
        state.roomLayout,
        state.activeDeskId,
        state.user?.email
      );
      const rawLv =
        upgradeEmail !== undefined ? (state.monitorLevelByEmail[upgradeEmail] ?? 0) : 0;
      const monitorLv = Math.min(
        MONITOR_UPGRADE_MAX_LEVEL,
        Math.max(0, Math.floor(rawLv))
      );
      const basePerMin = focusReamsPerMinute(monitorLv);
      const mult = focusReamMultiplier(state.focusEnergy);
      let reamsPerMin = basePerMin * mult;
      const pyramidExp = state.teamPyramidBuffExpiresAt;
      if (
        typeof pyramidExp === 'number' &&
        Number.isFinite(pyramidExp) &&
        Date.now() < pyramidExp
      ) {
        reamsPerMin *= TEAM_PYRAMID_FOCUS_REAM_MULTIPLIER;
      }
      const lastT = state.lastFocusPaperTickAt > 0 ? state.lastFocusPaperTickAt : now;
      const dtSec = Math.min(120, Math.max(0, (now - lastT) / 1000));
      const addFloat = (reamsPerMin / 60) * dtSec;
      const carry = state.sessionPaperAccruedFloat + addFloat;
      const whole = Math.floor(carry);
      const frac = carry - whole;
      if (whole > 0) {
        newPaperReams += whole;
        newSessionPaper = state.sessionPaper + whole;
        newLastPaperEarnedAt = now;
      }
      newAccruedFloat = frac;
      newLastPaperTick = now;
    }

    return {
      timeLeft: newTimeLeft,
      timerEndsAt: endsAt,
      paperReams: newPaperReams,
      sessionPaper: newSessionPaper,
      lastPaperEarnedAt: newLastPaperEarnedAt,
      sessionPaperAccruedFloat: newAccruedFloat,
      lastFocusPaperTickAt: newLastPaperTick,
    };
  }),
  resetTimer: () =>
    set((state) => ({
      isTimerActive: false,
      isTimerPaused: false,
      timeLeft: state.timerMode === 'focus' ? POMODORO_FOCUS_DURATION_SEC : POMODORO_BREAK_DURATION_SEC,
      activeDeskId: null,
      sessionPaper: 0,
      sessionPaperAccruedFloat: 0,
      lastFocusPaperTickAt: 0,
      focusSitPoseIndex: 0,
      focusSavingModeEnabled: false,
      timerEndsAt: null,
    })),

  focusEnergy: 100,
  focusEnergyLastTickAt: 0,
  setFocusEnergy: (value) =>
    set({
      focusEnergy: clampFocusEnergy(value),
      focusEnergyLastTickAt: Date.now(),
    }),
  tickFocusEnergyWallClock: () =>
    set((state) => {
      if (!state.user) return {};
      const now = Date.now();
      const last = state.focusEnergyLastTickAt;
      if (last <= 0) return { focusEnergyLastTickAt: now };
      const inSeatedFocus =
        state.isTimerActive && state.timerMode === 'focus' && !state.isTimerPaused;
      const mode = inSeatedFocus ? 'focus' : 'idle';
      const upgradeEmail = inSeatedFocus
        ? getEffectiveDeskUpgradeEmail(
            state.roomLayout,
            state.activeDeskId,
            state.user?.email
          )
        : undefined;
      const rawChair =
        upgradeEmail !== undefined ? (state.chairLevelByEmail[upgradeEmail] ?? 0) : 0;
      const chairLv = Math.min(
        CHAIR_UPGRADE_MAX_LEVEL,
        Math.max(0, Math.floor(rawChair))
      );
      const overlapMin = waterBuffOverlapMinutes(last, now, state.waterBuffExpiresAt);
      const base = settleFocusEnergy(state.focusEnergy, last, now, mode, chairLv);
      const settled = clampFocusEnergy(
        base + FOCUS_ENERGY_WATER_BUFF_REGEN_PER_MIN * overlapMin
      );
      return { focusEnergy: settled, focusEnergyLastTickAt: now };
    }),
  consumeFocusEnergy: (amount) => {
    const a = Math.max(0, amount);
    if (a <= 0) return true;
    const state = get();
    if (state.focusEnergy < a) return false;
    set({
      focusEnergy: clampFocusEnergy(state.focusEnergy - a),
      focusEnergyLastTickAt: Date.now(),
    });
    return true;
  },
  parkourEnergyHintUntil: 0,
  flashParkourEnergyInsufficientHint: () =>
    set({ parkourEnergyHintUntil: Date.now() + 2600 }),

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

  teamPyramidBuffExpiresAt: null,
  setTeamPyramidBuffExpiresAt: (expiresAt) => set({ teamPyramidBuffExpiresAt: expiresAt }),
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
