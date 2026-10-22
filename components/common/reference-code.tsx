import { cn } from "@/lib/utils";

export function ReferenceCode({ value, title, className }: { value: string; title?: string; className?: string }) {
  return (
    <span title={title} className={cn("font-mono text-xs break-all select-all", className)}>
      {value}
    </span>
  );
}
