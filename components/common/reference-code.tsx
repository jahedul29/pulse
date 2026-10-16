import { cn } from "@/lib/utils";

export function ReferenceCode({ value, className }: { value: string; className?: string }) {
  return <span className={cn("font-mono text-xs break-all select-all", className)}>{value}</span>;
}
