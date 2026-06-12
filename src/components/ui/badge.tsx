import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const toneMap = {
  rose: "bg-rose-50 text-rose-600 ring-rose-100",
  zinc: "bg-white/80 text-zinc-600 ring-black/6",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
};

export function Badge({
  className,
  tone = "zinc",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof toneMap }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset",
        toneMap[tone],
        className,
      )}
      {...props}
    />
  );
}
