import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import Topbar from "../components/Topbar.jsx";
import OnlineUserAlert from "../components/OnlineUserAlert.jsx";
import CommandPalette from "../components/CommandPalette.jsx";
import { NAV } from "../nav.config.js";

function titleFor(pathname) {
  for (const item of NAV) {
    if (item.type === "link" && item.to === pathname) return item.label;
    if (item.type === "group") {
      const child = item.children?.find((c) => pathname.startsWith(c.to));
      if (child) return `${item.label} · ${child.label}`;
    }
  }
  if (pathname.startsWith("/settings")) return "Settings";
  return "Huska Admin";
}

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="w-full min-h-screen flex" style={{ backgroundColor: "var(--bg)" }}>
      <OnlineUserAlert />
      <CommandPalette />
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ backgroundColor: "rgba(10,12,16,0.4)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}
      <main className="flex-1 min-w-0 flex flex-col">
        <Topbar title={titleFor(location.pathname)} onOpenMobileNav={() => setMobileOpen(true)} />
        <div className="p-6 flex flex-col gap-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
