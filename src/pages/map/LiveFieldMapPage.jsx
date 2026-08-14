import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Radio, Wifi, ClipboardList, Calendar, RefreshCw, Maximize2, Minimize2 } from "lucide-react";
import { Field, SelectInput, TextInput } from "../../components/FormField.jsx";
import { fieldCheckInsApi } from "../../api/fieldCheckIns.api.js";
import { programsApi } from "../../api/programs.api.js";
import { useSocket } from "../../context/SocketContext.jsx";

const RWANDA_CENTER = [-1.9403, 29.8739];
const STALE_AFTER_MS = 15 * 60 * 1000; // a ping older than this reads as "stale", not gone

function bestPosition(checkIn) {
  if (!checkIn) return null;
  if (checkIn.currentGpsLat != null && checkIn.currentGpsLng != null) {
    return { lat: checkIn.currentGpsLat, lng: checkIn.currentGpsLng, at: checkIn.currentGpsAt };
  }
  if (checkIn.gpsLat != null && checkIn.gpsLng != null) {
    return { lat: checkIn.gpsLat, lng: checkIn.gpsLng, at: checkIn.checkInAt };
  }
  return null;
}

function markerColor(entry) {
  if (!entry.checkIn || entry.checkIn.checkOutAt) return "#8790A3"; // checked out / no session today
  const pos = bestPosition(entry.checkIn);
  if (!pos?.at) return "#D98A0E";
  const age = Date.now() - new Date(pos.at).getTime();
  return age > STALE_AFTER_MS ? "#D98A0E" : "#12B5A6"; // amber if stale, teal if fresh
}

function dotIcon(color) {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:16px;height:16px;border-radius:999px;background:${color};border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
}

function timeAgo(iso) {
  if (!iso) return "never";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

export default function LiveFieldMapPage() {
  const { socket } = useSocket();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map()); // userId -> L.Marker

  const [programs, setPrograms] = useState([]);
  const [programId, setProgramId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const isToday = date === new Date().toISOString().slice(0, 10);

  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    programsApi.list().then(setPrograms).catch(() => {});
  }, []);

  async function loadRoster() {
    setLoading(true);
    setError("");
    try {
      const res = await fieldCheckInsApi.roster({ programId: programId || undefined, date });
      setRoster(res.roster || []);
    } catch (err) {
      setError(err.message || "Couldn't load field staff locations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRoster();
    // Safety-net refresh in case a socket drops — live pings still keep it current in between.
    if (!isToday) return undefined;
    const interval = setInterval(loadRoster, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, date]);

  // Live location pushes — move a marker instantly instead of waiting on the next poll.
  useEffect(() => {
    if (!socket || !isToday) return undefined;
    function onLocationUpdate(payload) {
      setRoster((prev) =>
        prev.map((r) =>
          r.userId === payload.userId
            ? { ...r, checkIn: { ...r.checkIn, currentGpsLat: payload.lat, currentGpsLng: payload.lng, currentGpsAt: payload.at } }
            : r
        )
      );
    }
    socket.on("location:update", onLocationUpdate);
    return () => socket.off("location:update", onLocationUpdate);
  }, [socket, isToday]);

  const withPosition = useMemo(() => roster.filter((r) => bestPosition(r.checkIn)), [roster]);
  const live = useMemo(
    () => withPosition.filter((r) => r.checkIn && !r.checkIn.checkOutAt && markerColor(r) === "#12B5A6").length,
    [withPosition]
  );

  // Mount the map once.
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return undefined;
    const map = L.map(mapContainerRef.current, { zoomControl: true }).setView(RWANDA_CENTER, 8);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync markers whenever the roster changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set();
    for (const entry of withPosition) {
      const pos = bestPosition(entry.checkIn);
      seen.add(entry.userId);
      const color = markerColor(entry);
      const existing = markersRef.current.get(entry.userId);

      const popupHtml = `
        <div style="font-family:Inter,sans-serif;min-width:180px">
          <div style="font-weight:600;margin-bottom:2px">${entry.name}</div>
          <div style="font-size:12px;color:#6B7280;margin-bottom:6px">${entry.checkIn?.checkOutAt ? "Checked out" : "On duty"} · updated ${timeAgo(pos.at)}</div>
          <div style="font-size:12px;display:flex;gap:8px;flex-wrap:wrap">
            <span>Assigned: <strong>${entry.assigned}</strong></span>
            <span>Done: <strong>${entry.completed}</strong></span>
            <span>Refused: <strong>${entry.refused}</strong></span>
            <span>Not found: <strong>${entry.notFound}</strong></span>
          </div>
        </div>`;

      if (existing) {
        existing.setLatLng([pos.lat, pos.lng]);
        existing.setIcon(dotIcon(color));
        existing.setPopupContent(popupHtml);
      } else {
        const marker = L.marker([pos.lat, pos.lng], { icon: dotIcon(color) })
          .addTo(map)
          .bindPopup(popupHtml)
          .on("click", () => setSelectedUserId(entry.userId));
        markersRef.current.set(entry.userId, marker);
      }
    }

    // Drop markers for staff no longer in the filtered roster (e.g. switched program).
    for (const [userId, marker] of markersRef.current) {
      if (!seen.has(userId)) {
        marker.remove();
        markersRef.current.delete(userId);
      }
    }

    // Fit bounds only on the first population of markers for this load, so a
    // live ping moving one pin doesn't keep yanking everyone's zoom around.
  }, [withPosition]);

  // Fit bounds once per roster load (separate effect so live single-marker
  // moves above don't trigger a re-fit).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || withPosition.length === 0) return;
    const bounds = L.latLngBounds(withPosition.map((r) => {
      const p = bestPosition(r.checkIn);
      return [p.lat, p.lng];
    }));
    map.fitBounds(bounds.pad(0.25), { maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster.length, programId, date]);

  // Leaflet lays tiles out against its container's size at mount time — a
  // CSS-only fullscreen toggle like this one doesn't fire a window resize
  // event, so without this the map would freeze at its old dimensions and
  // show gray gaps until the user manually panned it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const id = setTimeout(() => map.invalidateSize(), 220);
    return () => clearTimeout(id);
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return undefined;
    function onKeyDown(e) {
      if (e.key === "Escape") setIsFullscreen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
            <Radio size={20} style={{ color: "var(--teal)" }} />
            Live Field Map
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Where checked-in field staff are right now, updating live as they move.
          </p>
        </div>
        <button className="btn-secondary" onClick={loadRoster} disabled={loading}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div
        className="card p-4 flex flex-col gap-4"
        style={
          isFullscreen
            ? { position: "fixed", inset: 0, zIndex: 100, borderRadius: 0, height: "100vh", overflowY: "auto" }
            : undefined
        }
      >
        <div className="flex items-end gap-3 flex-wrap">
          <Field label="Program">
            <SelectInput icon={ClipboardList} value={programId} onChange={(e) => setProgramId(e.target.value)} style={{ minWidth: 200 }}>
              <option value="">All programs</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Date">
            <TextInput icon={Calendar} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>

          <div className="flex items-center gap-4 ml-auto text-sm">
            <span className="flex items-center gap-1.5" style={{ color: "var(--text)" }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: "#12B5A6", display: "inline-block" }} />
              {live} live
            </span>
            <span className="flex items-center gap-1.5" style={{ color: "var(--text)" }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: "#D98A0E", display: "inline-block" }} />
              stale ping
            </span>
            <span className="flex items-center gap-1.5" style={{ color: "var(--text)" }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: "#8790A3", display: "inline-block" }} />
              checked out
            </span>
            <button
              className="btn-secondary"
              onClick={() => setIsFullscreen((f) => !f)}
              aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
              title={isFullscreen ? "Exit full screen (Esc)" : "Full screen"}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: "var(--status-suspended-bg)", color: "var(--status-suspended-fg)" }}>
            {error}
          </div>
        )}

        <div
          ref={mapContainerRef}
          style={{
            height: isFullscreen ? "calc(100vh - 180px)" : "60vh",
            minHeight: 420,
            borderRadius: isFullscreen ? 0 : 16,
            overflow: "hidden",
            border: "1px solid var(--border)",
          }}
        />

        {!loading && withPosition.length === 0 && (
          <div className="flex items-center gap-2 text-sm justify-center py-6" style={{ color: "var(--muted)" }}>
            <MapPin size={16} />
            No GPS positions yet for {isToday ? "today" : date} , staff show up here once they check in with location enabled.
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
          <Wifi size={13} />
          {isToday ? "Live moves instantly as staff check in and their location updates." : "Historical view , showing where staff were, not live."}
        </div>
      </div>
    </div>
  );
}
