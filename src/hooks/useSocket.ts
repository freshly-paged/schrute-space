import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Player, ChatMessage, AvatarConfig, FurnitureItem, RoomInfo, RoomRole, RoomMember } from '../types';
import { AuthUser } from './useAuth';
import { useGameStore } from '../store/useGameStore';

export function useSocket(user: AuthUser | null, currentRoom: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [isConnected, setIsConnected] = useState(false);

  const syncOccupiedDesks = (playerMap: Record<string, Player>) => {
    const ids = Object.values(playerMap)
      .filter((p) => p.activeDeskId)
      .map((p) => p.activeDeskId as string);
    useGameStore.getState().setOccupiedDeskIds(ids);
  };
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [lastLocalMessage, setLastLocalMessage] = useState<{ text: string; time: number } | null>(null);
  const [disconnectReason, setDisconnectReason] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !currentRoom) return;

    const newSocket = io({
      withCredentials: true,
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
      syncOccupiedDesks(others);
    });

    newSocket.on('newPlayer', (player: Player) => {
      setPlayers((prev) => {
        const next = { ...prev, [player.id]: player };
        syncOccupiedDesks(next);
        return next;
      });
    });

    newSocket.on('playerMoved', (player: Player) => {
      setPlayers((prev) => {
        const next = { ...prev, [player.id]: player };
        syncOccupiedDesks(next);
        return next;
      });
    });

    newSocket.on('chatMessage', (message: ChatMessage) => {
      setChatHistory((prev) => [...prev.slice(-49), message]);

      if (message.playerId !== newSocket.id) {
        setPlayers((prev) => {
          if (!prev[message.playerId]) return prev;
          return {
            ...prev,
            [message.playerId]: {
              ...prev[message.playerId],
              lastMessage: message.text,
              lastMessageTime: message.time,
            },
          };
        });
      } else {
        setLastLocalMessage({ text: message.text, time: message.time });
      }
    });

    newSocket.on('playerDisconnected', (id: string) => {
      setPlayers((prev) => {
        const next = { ...prev };
        delete next[id];
        syncOccupiedDesks(next);
        return next;
      });
    });

    newSocket.on('paperReamsLoaded', (count: number) => {
      useGameStore.getState().setPaperReams(count);
    });

    newSocket.on('avatarConfigLoaded', (config: AvatarConfig) => {
      useGameStore.getState().setAvatarConfig(config);
    });

    newSocket.on('roomLayoutLoaded', (layout: FurnitureItem[]) => {
      useGameStore.getState().setRoomLayout(layout);
    });

    newSocket.on('roomLayoutUpdated', (layout: FurnitureItem[]) => {
      useGameStore.getState().setRoomLayout(layout);
    });

    newSocket.on('roomInfoLoaded', (info: RoomInfo) => {
      useGameStore.getState().setRoomInfo(info);
    });

    newSocket.on('roomMembersUpdated', (payload: { roomId: string; members?: RoomMember[]; maxWorkers?: number }) => {
      const current = useGameStore.getState().roomInfo;
      if (!current) return;
      useGameStore.getState().setRoomInfo({
        ...current,
        ...(payload.members !== undefined && {
          memberCount: payload.members.length,
          members: payload.members,
        }),
        ...(payload.maxWorkers !== undefined && { maxWorkers: payload.maxWorkers }),
      });
    });

    newSocket.on('roleChanged', ({ newRole }: { newRole: RoomRole | null }) => {
      const current = useGameStore.getState().roomInfo;
      if (current) useGameStore.getState().setRoomInfo({ ...current, myRole: newRole });
    });

    // Sync paper reams to server whenever the count changes
    const unsubscribeReams = useGameStore.subscribe((state, prev) => {
      if (state.paperReams !== prev.paperReams) {
        newSocket.emit('savePaperReams', state.paperReams);
      }
    });

    return () => {
      unsubscribeReams();
      useGameStore.getState().setRoomInfo(null);
      newSocket.disconnect();
    };
  }, [user, currentRoom]);

  const sendMessage = useCallback(
    (text: string) => {
      socket?.emit('chatMessage', text);
    },
    [socket]
  );

  const saveAvatarConfig = useCallback(
    (config: AvatarConfig) => {
      socket?.emit('saveAvatarConfig', config);
    },
    [socket]
  );

  return {
    socket,
    players,
    isConnected,
    chatHistory,
    lastLocalMessage,
    disconnectReason,
    connectionError,
    sendMessage,
    saveAvatarConfig,
  };
}
