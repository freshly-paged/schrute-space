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
  isRolling?: boolean;
  rollTimer?: number;
  isFocused?: boolean;
  focusProgress?: number; // 0-1
  activeDeskId?: string | null;
  avatarConfig?: AvatarConfig;
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
