import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SectionCard({
  title,
  description,
  children,
  action,
  className,
  contentClassName
}: SectionCardProps) {
  return (
    <Card className={cn("rounded-3xl border-border/80 bg-card shadow-sm hover:shadow-md/5 transition-all duration-300 overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between p-6 pb-4 space-y-0">
        <div>
          <CardTitle className="text-lg font-semibold tracking-tight text-foreground">{title}</CardTitle>
          {description && <CardDescription className="text-sm text-muted-foreground mt-0.5">{description}</CardDescription>}
        </div>
        {action && <div className="flex items-center">{action}</div>}
      </CardHeader>
      <CardContent className={cn("p-6 pt-0", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
