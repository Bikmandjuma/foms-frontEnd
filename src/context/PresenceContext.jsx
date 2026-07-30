import React, { createContext, useContext, useEffect, useState } from "react";
import { useSocket } from "./SocketContext.jsx";

const PresenceContext = createContext({ onlineUserIds: [], onlineCount: 0 });

// Real, live presence — not a poll. The server pushes an updated
// onlineUserIds list to everyone in the tenant the instant someone
// connects or disconnects a socket (see realtime/socket.ts on the backend).
export function PresenceProvider({ children }) {
  const { socket } = useSocket();
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  useEffect(() => {
    if (!socket) {
      setOnlineUserIds([]);
      return undefined;
    }
    function handler(payload) {
      setOnlineUserIds(payload?.onlineUserIds || []);
    }
    socket.on("presence:update", handler);
    return () => socket.off("presence:update", handler);
  }, [socket]);

  return (
    <PresenceContext.Provider value={{ onlineUserIds, onlineCount: onlineUserIds.length }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  return useContext(PresenceContext);
}
