import React, { useEffect, useRef, useState } from "react";
import { usePresence } from "../context/PresenceContext.jsx";

const MAX_BARS = 14;
const SAMPLE_INTERVAL_MS = 4000;
const MAX_BAR_HEIGHT = 96;
const MIN_BAR_HEIGHT = 10;

/**
 * A live-scrolling history of the online-user count, sampled every few
 * seconds. Each new reading appears as a bar on the right and everything
 * shifts left as older samples age out — a moving strip chart, not a
 * static snapshot. Bar height scales with the count (capped against the
 * highest value currently visible, so one busy moment doesn't flatten
 * everything else); the number is printed above each bar.
 */
export default function LiveOnlineUsersBarChart() {
  const { onlineCount } = usePresence();
  const [samples, setSamples] = useState(() => [{ id: 0, value: onlineCount }]);
  const nextId = useRef(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setSamples((prev) => {
        const next = [...prev, { id: nextId.current++, value: onlineCount }];
        return next.length > MAX_BARS ? next.slice(next.length - MAX_BARS) : next;
      });
    }, SAMPLE_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineCount]);

  const maxValue = Math.max(1, ...samples.map((s) => s.value));

  return (
    <div className="flex items-end gap-2" style={{ height: MAX_BAR_HEIGHT + 28, overflow: "hidden" }}>
      {samples.map((s) => {
        const height = Math.max(MIN_BAR_HEIGHT, (s.value / maxValue) * MAX_BAR_HEIGHT);
        return (
          <div
            key={s.id}
            className="flex flex-col items-center justify-end flex-shrink-0"
            style={{ width: 20, transition: "height .5s ease" }}
          >
            <span className="mono text-[11px] mb-1" style={{ color: "var(--text)" }}>
              {s.value}
            </span>
            <div
              style={{
                width: 14,
                height,
                borderRadius: 5,
                backgroundColor: "var(--teal)",
                boxShadow: "0 0 8px rgba(45,212,191,0.35)",
                transition: "height .6s ease",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
