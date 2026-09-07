import React, { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

/**
 * A real hand-drawn signature captured on an HTML canvas — not a typed
 * name rendered in a fancy font. Works with mouse, touch, or a stylus
 * uniformly via the Pointer Events API, and accounts for devicePixelRatio
 * so the line stays crisp on retina screens instead of blurring.
 *
 * Calls onChange(dataUrl | null) after every stroke — null once cleared or
 * before anything's been drawn, so the parent can gate its Sign button on
 * "has an actual signature" rather than trusting a checkbox alone.
 */
export default function SignaturePad({ onChange, height = 160 }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = "#111111";
  }, [height]);

  function pointFromEvent(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e) {
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = pointFromEvent(e);
  }

  function handlePointerMove(e) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const point = pointFromEvent(e);
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
    if (isEmpty) setIsEmpty(false);
  }

  function handlePointerUp() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (!isEmpty) {
      onChange(canvasRef.current.toDataURL("image/png"));
    }
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        style={{
          border: "1px dashed var(--border)",
          borderRadius: 10,
          backgroundColor: "#ffffff",
          touchAction: "none",
          cursor: "crosshair",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height, display: "block", borderRadius: 10 }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          {isEmpty ? "Draw your signature above with your mouse, finger, or stylus." : "Looks good — you can clear and redo it any time before signing."}
        </p>
        <button type="button" className="btn-secondary" style={{ height: 28, padding: "0 10px" }} onClick={handleClear} disabled={isEmpty}>
          <Eraser size={13} />
          Clear
        </button>
      </div>
    </div>
  );
}
