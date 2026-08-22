"use client";

import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function HideButton({
  onClick,
  label,
  className,
}: {
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "group/eye relative grid size-8 place-items-center rounded-lg text-muted-foreground opacity-70 transition-[opacity,background-color,color,transform] duration-200 hover:scale-110 hover:bg-accent hover:text-primary focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-90 group-hover:opacity-100 motion-reduce:transition-none motion-reduce:hover:scale-100",
        className,
      )}
    >
      <Eye className="absolute size-4 opacity-100 transition-opacity duration-200 group-hover/eye:opacity-0 group-focus-visible/eye:opacity-0" />
      <EyeOff className="absolute size-4 opacity-0 transition-opacity duration-200 group-hover/eye:animate-[kpi-blink_0.45s_ease] group-hover/eye:opacity-100 group-focus-visible/eye:animate-[kpi-blink_0.45s_ease] group-focus-visible/eye:opacity-100 motion-reduce:animate-none" />
    </button>
  );
}
