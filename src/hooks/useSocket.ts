import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Player, ChatMessage, AvatarConfig, FurnitureItem, RoomInfo, RoomRole, RoomMember } from '../types';
import { AuthUser } from './useAuth';
import { useGameStore } from '../store/useGameStore';
import { MS_BODY_THROWABLE_ID } from '../propIds';

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

  const syncRemoteWornThrowableIds = (playerMap: Record<string, Player>) => {
    const worn: string[] = [];
    for (const p of Object.values(playerMap)) {
      if (p.wornPropId) worn.push(p.wornPropId);
    }
    useGameStore.getState().setRemoteWornThrowableIds(worn);
  };

  const syncFromPlayerMap = (playerMap: Record<string, Player>) => {
    syncOccupiedDesks(playerMap);
    syncRemoteWornThrowableIds(playerMap);
  };
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [lastLocalMessage, setLastLocalMessage] = useState<{ text: string; time: number } | null>(null);
  const [disconnectReason, setDisconnectReason] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !currentRoom) return;

    console.log(`[socket] connecting for user=${user.email} room=${currentRoom}`);
    const newSocket = io({
      withCredentials: true,
      reconnectionAttempts: 5,
      timeout: 10000,
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      console.log(`[socket] connected id=${newSocket.id}, joining room=${currentRoom}`);
      newSocket.emit('joinRoom', { roomId: currentRoom });
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log(`[socket] disconnected reason=${reason}`);
    });

    newSocket.on('reconnect', (attempt: number) => {
      console.log(`[socket] reconnected after ${attempt} attempt(s)`);
    });

    newSocket.on('reconnect_error', (err: Error) => {
      console.error('[socket] reconnect error:', err.message);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('[socket] all reconnection attempts failed');
    });

    newSocket.on('connect_error', (err) => {
      console.error('[socket] connection error:', err.message);
      setConnectionError(`Connection failed: ${err.message}`);
    });

    newSocket.on('forceDisconnect', (reason: string) => {
      console.warn('[socket] force-disconnected by server:', reason);
      setDisconnectReason(reason);
      newSocket.disconnect();
    });

    newSocket.on('currentPlayers', (serverPlayers: Record<string, Player>) => {
      const others = { ...serverPlayers };
      delete others[newSocket.id!];
      console.log(`[socket] currentPlayers: ${Object.keys(others).length} other player(s) in room`);
      setPlayers(others);
      syncFromPlayerMap(others);
    });

    newSocket.on('newPlayer', (player: Player) => {
      console.log(`[socket] newPlayer: ${player.name} (${player.id})`);
      setPlayers((prev) => {
        const next = { ...prev, [player.id]: player };
        syncFromPlayerMap(next);
        return next;
      });
    });

    newSocket.on('playerMoved', (player: Player) => {
      setPlayers((prev) => {
        const next = { ...prev, [player.id]: player };
        syncFromPlayerMap(next);
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

    newSocket.on(
      'ambientSpeech',
      (payload: { playerId: string; text: string; time: number }) => {
        if (!payload?.playerId || typeof payload.text !== 'string' || typeof payload.time !== 'number') return;
        if (payload.playerId !== newSocket.id) {
          setPlayers((prev) => {
            if (!prev[payload.playerId]) return prev;
            return {
              ...prev,
              [payload.playerId]: {
                ...prev[payload.playerId],
                lastMessage: payload.text,
                lastMessageTime: payload.time,
              },
            };
          });
        } else {
          setLastLocalMessage({ text: payload.text, time: payload.time });
        }
      }
    );

    newSocket.on('playerDisconnected', (id: string) => {
      console.log(`[socket] playerDisconnected: ${id}`);
      setPlayers((prev) => {
        const next = { ...prev };
        delete next[id];
        syncFromPlayerMap(next);
        return next;
      });
    });

    newSocket.on(
      'throwableRestSync',
      (data: { throwableId: string; position: number[]; rotation: number[] }) => {
        if (!data || data.throwableId !== MS_BODY_THROWABLE_ID) return;
        const { position, rotation } = data;
        if (!Array.isArray(position) || position.length !== 3) return;
        if (!Array.isArray(rotation) || rotation.length !== 3) return;
        useGameStore.getState().setThrowableRest(data.throwableId, position as [number, number, number], rotation as [number, number, number]);
      }
    );

    newSocket.on('paperReamsLoaded', (count: number) => {
      console.log(`[socket] paperReamsLoaded: ${count}`);
      useGameStore.getState().setPaperReams(count);
    });

    newSocket.on('avatarConfigLoaded', (config: AvatarConfig) => {
      console.log('[socket] avatarConfigLoaded');
      useGameStore.getState().setAvatarConfig(config);
    });

    newSocket.on('roomLayoutLoaded', (layout: FurnitureItem[]) => {
      console.log(`[socket] roomLayoutLoaded: ${layout.length} item(s)`);
      useGameStore.getState().setRoomLayout(layout);
    });

    newSocket.on('roomLayoutUpdated', (layout: FurnitureItem[]) => {
      console.log(`[socket] roomLayoutUpdated: ${layout.length} item(s)`);
      useGameStore.getState().setRoomLayout(layout);
    });

    newSocket.on('roomInfoLoaded', (info: RoomInfo) => {
      console.log(`[socket] roomInfoLoaded: role=${info.myRole ?? 'visitor'} members=${info.memberCount}`);
      useGameStore.getState().setRoomInfo(info);
    });

    newSocket.on('roomMembersUpdated', (payload: { roomId: string; members?: RoomMember[]; maxWorkers?: number }) => {
      console.log('[socket] roomMembersUpdated', payload.members ? `members=${payload.members.length}` : '', payload.maxWorkers !== undefined ? `maxWorkers=${payload.maxWorkers}` : '');
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
      console.log(`[socket] roleChanged: newRole=${newRole ?? 'none'}`);
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
      console.log(`[socket] cleaning up, disconnecting from room=${currentRoom}`);
      unsubscribeReams();
      useGameStore.getState().setRoomInfo(null);
      useGameStore.getState().setRemoteWornThrowableIds([]);
      useGameStore.getState().clearWornProp();
      useGameStore.getState().setNearWaterCooler(false);
      useGameStore.getState().setWaterBuffExpiresAt(null);
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
