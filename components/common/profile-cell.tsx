import { User } from "lucide-react";
import { cn } from "@/lib/utils";

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ProfileCell({
  name,
  initials,
  subtitle,
  unmatched = false,
  className,
}: {
  name: string;
  initials?: string;
  subtitle?: string;
  unmatched?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/12 font-heading text-xs font-semibold text-primary ring-1 ring-primary/20">
        {unmatched ? <User className="size-3.5" /> : (initials ?? initialsOf(name))}
      </span>
      <div className="min-w-0">
        <div className="truncate font-medium">{name}</div>
        {subtitle != null && subtitle !== "" && (
          <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
        )}
      </div>
    </div>
  );
}
