import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  description: string;
}

export function StatCard({ icon: Icon, label, value, description }: StatCardProps) {
  return (
    <Card className="rounded-[16px] border border-border/80 shadow-sm bg-card hover:shadow-md/5 transition-all duration-300 select-none">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="size-11 rounded-xl bg-secondary/50 flex items-center justify-center text-muted-foreground flex-shrink-0">
          <Icon className="size-5 text-muted-foreground/80" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-0.5 tracking-tight">{value}</p>
          <p className="text-[10px] text-muted-foreground/85 truncate mt-0.5">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
