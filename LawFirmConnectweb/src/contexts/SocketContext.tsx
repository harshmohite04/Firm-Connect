import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAuthToken, getAuthData } from '../utils/storage';

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: Set<string>;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  onlineUsers: new Set(),
  isConnected: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const cleanedUp = useRef(false);

  useEffect(() => {
    cleanedUp.current = false;

    const token = getAuthToken();
    const userData = getAuthData() as { _id?: string; id?: string } | null;
    const userId = userData?._id || userData?.id;

    if (!token || !userId) return;

    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const newSocket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      if (cleanedUp.current) { newSocket.disconnect(); return; }
      setIsConnected(true);
      newSocket.emit('join', userId);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('onlineUsers', (userIds: string[]) => {
      if (!cleanedUp.current) setOnlineUsers(new Set(userIds));
    });

    newSocket.on('userOnline', (uid: string) => {
      if (!cleanedUp.current) {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          next.add(uid);
          return next;
        });
      }
    });

    newSocket.on('userOffline', (uid: string) => {
      if (!cleanedUp.current) {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          next.delete(uid);
          return next;
        });
      }
    });

    return () => {
      cleanedUp.current = true;
      newSocket.disconnect();
      setSocket(null);
    };
  }, []);

  const value = useMemo(() => ({ socket, onlineUsers, isConnected }), [socket, onlineUsers, isConnected]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextType {
  return useContext(SocketContext);
}
