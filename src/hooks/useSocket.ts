import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Player, ChatMessage } from '../types';
import { AuthUser } from './useAuth';
import { useGameStore } from '../store/useGameStore';

export function useSocket(user: AuthUser | null, currentRoom: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [lastLocalMessage, setLastLocalMessage] = useState<{ text: string; time: number } | null>(null);
  const [disconnectReason, setDisconnectReason] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !currentRoom) return;

    const token = localStorage.getItem('office_auth_token');
    const newSocket = io({
      withCredentials: true,
      auth: { token },
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
    });

    newSocket.on('newPlayer', (player: Player) => {
      setPlayers((prev) => ({ ...prev, [player.id]: player }));
    });

    newSocket.on('playerMoved', (player: Player) => {
      setPlayers((prev) => ({ ...prev, [player.id]: player }));
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
        return next;
      });
    });

    newSocket.on('paperReamsLoaded', (count: number) => {
      useGameStore.getState().setPaperReams(count);
    });

    // Sync paper reams to server whenever the count changes
    const unsubscribeReams = useGameStore.subscribe((state, prev) => {
      if (state.paperReams !== prev.paperReams) {
        newSocket.emit('savePaperReams', state.paperReams);
      }
    });

    return () => {
      unsubscribeReams();
      newSocket.disconnect();
    };
  }, [user, currentRoom]);

  const sendMessage = useCallback(
    (text: string) => {
      socket?.emit('chatMessage', text);
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
  };
}
