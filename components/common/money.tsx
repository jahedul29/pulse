import { DirhamSign } from "@/components/icons/currency-signs";
import { fmtMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Money({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-1 tabular", className)}>
      <DirhamSign className="h-[0.7em] w-auto shrink-0" />
      {fmtMoney(value)}
    </span>
  );
}
