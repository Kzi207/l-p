"use client";

import { useEffect, useRef, type PointerEvent } from "react";

// Share the wheel cooldown across camera/history so trackpad momentum does not
// immediately skip the first photo after opening history.
let lastWheelNavigation = 0;
const interactive = "button,input,textarea,select,label,a,video[controls],[data-gesture-scroll]";

export function useVerticalGesture(onSwipe: (direction: "up" | "down") => void, enabled = true) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onSwipe);
  callback.current = onSwipe;
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;
    let total = 0;
    let previousTime = 0;
    const wheel = (event: WheelEvent) => {
      if ((event.target as HTMLElement).closest(interactive) || Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.ctrlKey) return;
      event.preventDefault();
      const now = Date.now();
      if (now - lastWheelNavigation < 650) return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientHeight : 1);
      if (now - previousTime > 180 || Math.sign(total) !== Math.sign(delta)) total = 0;
      previousTime = now;
      total += delta;
      if (Math.abs(total) < 55) return;
      lastWheelNavigation = now;
      callback.current(total > 0 ? "up" : "down");
      total = 0;
    };
    node.addEventListener("wheel", wheel, { passive: false });
    return () => node.removeEventListener("wheel", wheel);
  });
  return {
    ref,
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      if (!enabled || event.pointerType !== "mouse" || event.button !== 0 || (event.target as HTMLElement).closest(interactive)) return;
      event.preventDefault();
      start.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerUp(event: PointerEvent<HTMLDivElement>) {
      const origin = start.current;
      start.current = null;
      if (!origin || origin.id !== event.pointerId) return;
      const dy = event.clientY - origin.y;
      if (Math.abs(dy) >= 55 && Math.abs(dy) > Math.abs(event.clientX - origin.x)) callback.current(dy < 0 ? "up" : "down");
    },
    onPointerCancel() { start.current = null; },
    onDragStart(event: React.DragEvent<HTMLDivElement>) { event.preventDefault(); },
  };
}
