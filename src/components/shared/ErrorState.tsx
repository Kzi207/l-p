import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string | Error | null;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Đã xảy ra lỗi",
  description,
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  const displayDescription =
    (description instanceof Error ? description.message : description) ||
    message ||
    "Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.";

  return (
    <div
      className={cn(
        "flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-destructive/20 bg-destructive/5 p-8 text-center select-none",
        className,
      )}
    >
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="size-5" />
      </div>
      <h3 className="mb-1 text-sm font-bold text-foreground">{title}</h3>
      <p className="mb-4 max-w-md text-xs text-muted-foreground">{displayDescription}</p>
      {onRetry ? (
        <Button
          onClick={onRetry}
          variant="secondary"
          className="rounded-xl border border-border/40 px-5 hover:bg-background"
        >
          Thử lại
        </Button>
      ) : null}
    </div>
  );
}
