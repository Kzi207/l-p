"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "color"> {
  size?: "sm" | "md" | "lg" | "xl" | number;
}

export function Logo({ size = "md", className, ...props }: LogoProps) {
  const sizeMap = {
    sm: 24,
    md: 32,
    lg: 48,
    xl: 80
  };

  const computedSize = typeof size === "number" ? size : sizeMap[size];

  return (
    <div
      className={cn("select-none transition-transform duration-300 relative inline-flex items-center justify-center", className)}
      style={{ width: computedSize, height: computedSize }}
      {...props}
    >
      <Image
        src="/logo.svg"
        alt="Logo"
        fill
        className="object-contain"
        priority
      />
    </div>
  );
}
