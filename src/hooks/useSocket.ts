import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Player, ChatMessage, AvatarConfig, FurnitureItem, RoomInfo, RoomRole, RoomMember } from '../types';
import { AuthUser } from './useAuth';
import { getEffectiveDeskUpgradeEmail } from '../deskOwner';
import { useGameStore } from '../store/useGameStore';
import { MS_BODY_THROWABLE_ID } from '../propIds';

export function useSocket(user: AuthUser | null, currentRoom: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [isConnected, setIsConnected] = useState(false);

  const syncFromPlayerMap = (playerMap: Record<string, Player>) => {
    const players = Object.values(playerMap);
    const occupiedDeskIds = players
      .filter((p) => p.activeDeskId)
      .map((p) => p.activeDeskId as string);
    const remoteWornThrowableIds: string[] = [];
    const remoteHeldThrowableIds: string[] = [];
    for (const p of players) {
      if (p.wornPropId) remoteWornThrowableIds.push(p.wornPropId);
      if (p.heldThrowableId) remoteHeldThrowableIds.push(p.heldThrowableId);
    }

    const state = useGameStore.getState();
    const arraysEqual = (a: string[], b: string[]) =>
      a.length === b.length && a.every((v, i) => v === b[i]);

    if (
      !arraysEqual(occupiedDeskIds, state.occupiedDeskIds) ||
      !arraysEqual(remoteWornThrowableIds, state.remoteWornThrowableIds) ||
      !arraysEqual(remoteHeldThrowableIds, state.remoteHeldThrowableIds)
    ) {
      useGameStore.setState({ occupiedDeskIds, remoteWornThrowableIds, remoteHeldThrowableIds });
    }
  };
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [lastLocalMessage, setLastLocalMessage] = useState<{
    text: string;
    time: number;
    durationMs?: number;
  } | null>(null);
  const [disconnectReason, setDisconnectReason] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !currentRoom) return;

    console.log(`[socket] connecting for user=${user.email} room=${currentRoom}`);
    const newSocket = io({
      withCredentials: true,
      reconnectionAttempts: 5,
      timeout: 10000,
      transports: ['websocket'],
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      console.log(`[socket] connected id=${newSocket.id}, joining room=${currentRoom}`);
      newSocket.emit('joinRoom', {
        roomId: currentRoom,
        focusEnergy: useGameStore.getState().focusEnergy,
      });
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

    newSocket.on('playersMoved', (batch: { id: string; position: [number,number,number]; rotation: [number,number,number]; isRolling: boolean; rollTimer: number }[]) => {
      setPlayers((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const snap of batch) {
          if (snap.id === newSocket.id) continue;
          const existing = prev[snap.id];
          if (!existing) continue;
          next[snap.id] = { ...existing, position: snap.position, rotation: snap.rotation, isRolling: snap.isRolling, rollTimer: snap.rollTimer };
          changed = true;
        }
        if (!changed) return prev;
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
              lastMessageDurationMs: undefined,
            },
          };
        });
      } else {
        setLastLocalMessage({ text: message.text, time: message.time, durationMs: undefined });
      }
    });

    newSocket.on(
      'ambientSpeech',
      (payload: { playerId: string; text: string; time: number; durationMs?: number }) => {
        if (!payload?.playerId || typeof payload.text !== 'string' || typeof payload.time !== 'number') return;
        const durationMs =
          typeof payload.durationMs === 'number' &&
          Number.isFinite(payload.durationMs) &&
          payload.durationMs > 0
            ? payload.durationMs
            : undefined;
        if (payload.playerId !== newSocket.id) {
          setPlayers((prev) => {
            if (!prev[payload.playerId]) return prev;
            return {
              ...prev,
              [payload.playerId]: {
                ...prev[payload.playerId],
                lastMessage: payload.text,
                lastMessageTime: payload.time,
                lastMessageDurationMs: durationMs,
              },
            };
          });
        } else {
          setLastLocalMessage({ text: payload.text, time: payload.time, durationMs });
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

    newSocket.on('focusEnergyLoaded', (energy: number) => {
      if (typeof energy === 'number' && Number.isFinite(energy)) {
        useGameStore.getState().setFocusEnergy(energy);
      }
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

    newSocket.on('deskChairLevels', (map: Record<string, number>) => {
      if (map && typeof map === 'object') useGameStore.getState().setDeskChairLevels(map);
    });

    newSocket.on('deskMonitorLevels', (map: Record<string, number>) => {
      if (map && typeof map === 'object') useGameStore.getState().setDeskMonitorLevels(map);
    });

    newSocket.on('chairLevelUpdated', (payload: { email: string; level: number }) => {
      if (payload?.email && typeof payload.level === 'number') {
        useGameStore.getState().patchChairLevel(payload.email, payload.level);
      }
    });

    newSocket.on('monitorLevelUpdated', (payload: { email: string; level: number }) => {
      if (payload?.email && typeof payload.level === 'number') {
        useGameStore.getState().patchMonitorLevel(payload.email, payload.level);
      }
    });

    newSocket.on('deskItemsLoaded', (map: Record<string, unknown[]>) => {
      if (map && typeof map === 'object') useGameStore.getState().setDeskItemsByEmail(map as Record<string, import('../types').DeskItemPlacement[]>);
    });

    newSocket.on('deskItemUpdated', (payload: { email: string; items: import('../types').DeskItemPlacement[] }) => {
      if (payload?.email && Array.isArray(payload.items)) {
        useGameStore.getState().patchDeskItems(payload.email, payload.items);
      }
    });

    newSocket.on('teamUpgradePoolsLoaded', (pools: Record<string, import('../types').TeamUpgradePool>) => {
      if (pools && typeof pools === 'object') useGameStore.getState().setTeamUpgradePools(pools);
    });

    newSocket.on('teamUpgradePoolUpdated', (payload: { upgradeType: string; pool: import('../types').TeamUpgradePool }) => {
      if (payload?.upgradeType && payload.pool) {
        useGameStore.getState().patchTeamUpgradePool(payload.upgradeType, payload.pool);
      }
    });

    newSocket.on('roomInfoLoaded', (info: RoomInfo) => {
      console.log(`[socket] roomInfoLoaded: role=${info.myRole ?? 'visitor'} members=${info.memberCount}`);
      useGameStore.getState().setRoomInfo(info);
    });

    newSocket.on('roomMembersUpdated', (payload: { roomId: string; members?: RoomMember[]; maxWorkers?: number; allowNewEmployees?: boolean }) => {
      console.log(
        '[socket] roomMembersUpdated',
        payload.members ? `members=${payload.members.length}` : '',
        payload.maxWorkers !== undefined ? `maxWorkers=${payload.maxWorkers}` : '',
        payload.allowNewEmployees !== undefined ? `allowNewEmployees=${payload.allowNewEmployees}` : ''
      );
      const current = useGameStore.getState().roomInfo;
      if (!current) return;
      useGameStore.getState().setRoomInfo({
        ...current,
        ...(payload.members !== undefined && {
          memberCount: payload.members.length,
          members: payload.members,
        }),
        ...(payload.maxWorkers !== undefined && { maxWorkers: payload.maxWorkers }),
        ...(payload.allowNewEmployees !== undefined && { allowNewEmployees: payload.allowNewEmployees }),
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

    let focusSaveTimer: ReturnType<typeof setTimeout> | null = null;
    const emitFocusEnergy = () => {
      if (!newSocket.connected) return;
      const s = useGameStore.getState();
      const mode =
        s.isTimerActive && s.timerMode === 'focus' && !s.isTimerPaused ? 'focus' : 'idle';
      const deskOwnerEmail =
        mode === 'focus'
          ? getEffectiveDeskUpgradeEmail(s.roomLayout, s.activeDeskId, s.user?.email) ?? null
          : null;
      newSocket.emit('saveFocusEnergy', {
        energy: s.focusEnergy,
        mode,
        deskOwnerEmail,
      });
    };
    const scheduleFocusSave = () => {
      if (focusSaveTimer) clearTimeout(focusSaveTimer);
      focusSaveTimer = setTimeout(() => {
        focusSaveTimer = null;
        emitFocusEnergy();
      }, 4000);
    };
    const unsubscribeFocusEnergy = useGameStore.subscribe((state, prev) => {
      if (
        state.focusEnergy === prev.focusEnergy &&
        state.isTimerActive === prev.isTimerActive &&
        state.timerMode === prev.timerMode &&
        state.isTimerPaused === prev.isTimerPaused &&
        state.activeDeskId === prev.activeDeskId &&
        state.roomLayout === prev.roomLayout
      ) {
        return;
      }
      scheduleFocusSave();
    });

    return () => {
      console.log(`[socket] cleaning up, disconnecting from room=${currentRoom}`);
      if (focusSaveTimer) clearTimeout(focusSaveTimer);
      emitFocusEnergy();
      unsubscribeFocusEnergy();
      unsubscribeReams();
      useGameStore.getState().resetChairLevels();
      useGameStore.getState().resetMonitorLevels();
      useGameStore.getState().resetDeskItems();
      useGameStore.getState().setTeamUpgradePools({});
      useGameStore.getState().setRoomInfo(null);
      useGameStore.getState().setRemoteWornThrowableIds([]);
      useGameStore.getState().clearWornProp();
      useGameStore.getState().setNearWaterCooler(false);
      useGameStore.getState().setWaterBuffExpiresAt(null);
      useGameStore.getState().setTeamPyramidBuffExpiresAt(null);
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
