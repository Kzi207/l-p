import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LoadingCardProps {
  className?: string;
  rows?: number;
  lines?: number;
}

export function LoadingCard({ className, rows = 3, lines }: LoadingCardProps) {
  const totalRows = lines ?? rows;

  return (
    <Card className={cn("rounded-3xl border-border/80 shadow-sm bg-card overflow-hidden", className)}>
      <CardHeader className="p-6 pb-2">
        <Skeleton className="h-6 w-1/3 rounded-md" />
        <Skeleton className="h-4 w-1/2 rounded-md mt-1" />
      </CardHeader>
      <CardContent className="p-6 pt-2 space-y-3">
        {Array.from({ length: totalRows }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("h-4 rounded-md", i === totalRows - 1 ? "w-4/5" : "w-full")}
          />
        ))}
      </CardContent>
    </Card>
  );
}
