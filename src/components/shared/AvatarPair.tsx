import { cn } from "@/lib/utils";

interface AvatarPairProps {
  avatar1: string | null;
  avatar2: string | null;
  name1?: string;
  name2?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AvatarPair({
  avatar1,
  avatar2,
  name1 = "User 1",
  name2 = "User 2",
  size = "md",
  className,
}: AvatarPairProps) {
  const fallback1 =
    avatar1 ??
    `https://ui-avatars.com/api/?background=F4F4F5&color=18181B&name=${encodeURIComponent(name1)}`;
  const fallback2 =
    avatar2 ??
    `https://ui-avatars.com/api/?background=F4F4F5&color=18181B&name=${encodeURIComponent(name2)}`;

  const sizeClasses = {
    sm: "w-8 h-8 flex-shrink-0 aspect-square border-2",
    md: "w-12 h-12 flex-shrink-0 aspect-square border-2",
    lg: "w-20 h-20 flex-shrink-0 aspect-square border-[3px]",
  };

  const spacingClasses = {
    sm: "-space-x-2.5",
    md: "-space-x-4",
    lg: "-space-x-6",
  };

  return (
    <div className={cn("flex items-center", spacingClasses[size], className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fallback1}
        alt={name1}
        className={cn(
          "rounded-full border-background bg-muted object-cover shadow-sm transition-all duration-300 hover:z-20",
          sizeClasses[size],
        )}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fallback2}
        alt={name2}
        className={cn(
          "rounded-full border-background bg-muted object-cover shadow-sm transition-all duration-300 hover:z-20",
          sizeClasses[size],
        )}
      />
    </div>
  );
}
