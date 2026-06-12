import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  className
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-3xl bg-card/30 min-h-[300px]",
      className
    )}>
      <div className="size-12 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground mb-4">
        <Icon className="size-6 text-muted-foreground/85" />
      </div>
      <h3 className="font-semibold text-lg text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {actionText && onAction && (
        <Button onClick={onAction} className="rounded-xl px-6 bg-primary text-primary-foreground hover:bg-primary/90">
          {actionText}
        </Button>
      )}
    </div>
  );
}
