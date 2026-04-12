export interface AvatarConfig {
  shirtColor: string;
  skinTone: string;
  pantColor: string;
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  shirtColor: '#4f46e5',
  skinTone: '#ffdbac',
  pantColor: '#333333',
};

export interface Player {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
  name: string;
  lastMessage?: string;
  lastMessageTime?: number;
  /** Optional bubble visibility duration in ms for the current overhead message. */
  lastMessageDurationMs?: number;
  isRolling?: boolean;
  rollTimer?: number;
  isFocused?: boolean;
  focusProgress?: number; // 0-1
  /** Index into seated leg presets; set when focused. */
  focusSitPoseIndex?: number;
  activeDeskId?: string | null;
  avatarConfig?: AvatarConfig;
  /** Prop id from ThrowableObject (e.g. ms_body) worn on the torso; synced for multiplayer. */
  wornPropId?: string | null;
  /** Throwable id currently held in hands; synced for multiplayer. */
  heldThrowableId?: string | null;
  /** Vend-O-Matic ice cream flavor index (0..4); only shown while not expired. */
  iceCreamFlavorIndex?: number | null;
  /** Wall-clock ms when the ice cream prop disappears (client + server validated). */
  iceCreamExpiresAt?: number | null;
  /** Scoop quarters left (1–4); omitted on older clients means full cone. */
  iceCreamRemainingQuarters?: number | null;
}

export interface FurnitureItem {
  id: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
  config: Record<string, unknown>;
}

export interface DeskItem extends FurnitureItem {
  type: 'desk';
  config: { ownerEmail: string; ownerName: string; model?: string; [key: string]: unknown };
}

/** A purchased desk decoration item placed at a specific position on the desk surface. */
export interface DeskItemPlacement {
  /** Catalog item id (e.g. 'dundie'). */
  id: string;
  /** Local desk X offset (-1..1). */
  x: number;
  /** Local desk Z offset (-0.4..0.4). */
  z: number;
}

/** In-memory state of a team upgrade contribution pool. */
export interface TeamUpgradePool {
  /** Total reams contributed so far this cycle. */
  contributed: number;
  /** Reams required to activate the upgrade. */
  target: number;
  /** email → amount contributed */
  contributors: Record<string, number>;
  /** Wall-clock ms when the active buff expires; null if not yet activated. */
  expiresAt: number | null;
}

/** Describes a room's footprint for the 2D floor-plan editor.
 *  Export one of these as `FLOOR_PLAN_RECT` from each room component so the
 *  customization page automatically stays in sync with the 3D layout. */
export interface FloorPlanRect {
  label: string;
  /** World-space X/Z min/max (same coordinate system as Three.js positions). */
  x1: number; z1: number;
  x2: number; z2: number;
  color: string;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  time: number;
}

export type RoomRole = 'admin' | 'manager' | 'worker';

export interface RoomMember {
  email: string;
  name: string | null;
  /** Job title from `users.job_title`; optional for older API payloads. */
  jobTitle?: string | null;
  role: RoomRole;
  isOnline?: boolean;
}

export interface RoomInfo {
  roomId: string;
  maxWorkers: number;
  myRole: RoomRole | null;
  memberCount: number;
  members: RoomMember[];
}

export interface MyRoom {
  roomId: string;
  role: RoomRole;
  maxWorkers: number;
  onlineCount: number;
}
