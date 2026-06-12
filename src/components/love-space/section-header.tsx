import type { ReactNode } from "react";

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-black/5 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--color-primary)]">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[var(--color-text)]">
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
