"use client";

import { useEffect } from "react";
import { installMouseDragScroll } from "@/lib/mouse-drag-scroll";

export function MouseDragScroll() {
  useEffect(() => installMouseDragScroll(document, window), []);
  return null;
}
