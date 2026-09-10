"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";

export const DEFAULT_AVATAR_URL = "/default-avatar.png";

export function AvatarImage({ src, alt = "Ảnh đại diện", className = "size-full object-cover" }: { src?: string | null; alt?: string; className?: string }) {
  const [source, setSource] = useState(src?.trim() || DEFAULT_AVATAR_URL);
  useEffect(() => setSource(src?.trim() || DEFAULT_AVATAR_URL), [src]);
  return <img src={source} alt={alt} className={className} onError={() => setSource(DEFAULT_AVATAR_URL)} />;
}
