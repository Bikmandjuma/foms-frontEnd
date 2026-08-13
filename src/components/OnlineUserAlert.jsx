import React, { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { useSocket } from "../context/SocketContext.jsx";

let idCounter = 0;

/**
 * A Supervisor or Enumerator logging in from the field gets a distinct,
 * unmissable alert — blue background, white text, bottom-right — separate
 * from the app's normal toast styling, so anyone watching the dashboard
 * (admin, HR, Data Manager) notices a field team came online. Fires off
 * the "user:online" socket event, which the backend only sends for users
 * with a groupCode (i.e. brought in via the Supervisor & Enumerator group
 * import) — never for admins signing into the dashboard themselves.
 */
export default function OnlineUserAlert() {
  const { socket } = useSocket();
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!socket) return undefined;
    function onUserOnline(payload) {
      const id = ++idCounter;
      setAlerts((prev) => [...prev, { id, ...payload }]);
      setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
      }, 6000);
    }
    socket.on("user:online", onUserOnline);
    return () => socket.off("user:online", onUserOnline);
  }, [socket]);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2" style={{ maxWidth: 340 }}>
      {alerts.map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg"
          style={{ backgroundColor: "#1D4ED8", color: "#FFFFFF", animation: "toast-in 0.25s ease-out" }}
        >
          <Radio size={18} className="flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold">{a.groupCode || a.groupName || "Field team"} is now online</div>
            <div className="opacity-90">
              {a.name}
              {a.roleName ? ` · ${a.roleName}` : ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
