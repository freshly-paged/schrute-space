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
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  time: number;
}
