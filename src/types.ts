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

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  time: number;
}
