import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getSavedStatus } from '../lib/presenceStatus';
import { getSocketUrl } from '../lib/serverConfig';
import { playMessageTone } from '../lib/soundSettings';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      return;
    }

    // A function (not a plain object) so the token/status are re-read fresh
    // on every reconnect attempt, not just captured once at socket creation —
    // otherwise a status change made just before a brief network drop would
    // be lost and overwritten back to a stale value on reconnect.
    const instance = io(getSocketUrl(), {
      auth: (cb) => cb({ token: localStorage.getItem('xenovaa_token'), status: getSavedStatus() }),
      autoConnect: true,
    });
    instance.on('receive_message', (msg) => {
      if (msg.sender_id !== user.id) playMessageTone();
    });

    socketRef.current = instance;
    setSocket(instance);

    return () => {
      instance.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
