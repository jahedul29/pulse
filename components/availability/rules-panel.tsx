import { CircleCheck, CircleX, ShieldCheck, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RuleResult } from "@/lib/availability/types";

export function RulesPanel({
  contextLabel,
  results,
  daysOffCount,
  maxDaysOff,
  weekValid,
  shake,
}: {
  contextLabel: string;
  results: RuleResult[];
  daysOffCount: number;
  maxDaysOff: number;
  weekValid: boolean;
  shake?: { ruleId: string; nonce: number } | null;
}) {
  const daysOffOk = daysOffCount <= maxDaysOff;
  const daysOffShaking = shake?.ruleId === "days-off";

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ring-1",
          weekValid
            ? "bg-success-muted text-success ring-success/30"
            : "bg-warning-muted text-warning ring-warning/30",
        )}
      >
        {weekValid ? <ShieldCheck className="size-4" /> : <TriangleAlert className="size-4" />}
        {weekValid ? "Schedule is valid" : "Some rules need attention"}
      </div>

      <div>
        <div className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {contextLabel}
        </div>
        <ul className="flex flex-col gap-1.5">
          {results.map((r) => {
            const shaking = shake?.ruleId === r.id;
            const error = !r.pass || shaking;
            return (
              <li
                key={shaking ? `${r.id}-${shake!.nonce}` : r.id}
                className={cn(
                  "flex gap-2 rounded-lg border p-2.5",
                  error ? "border-danger/40 bg-danger-muted/60" : "border-border bg-card",
                  shaking && "animate-rule-shake ring-1 ring-danger",
                )}
              >
                {error ? (
                  <CircleX className="mt-0.5 size-4 shrink-0 text-danger" />
                ) : (
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" />
                )}
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">{r.label}</span>
                    <span
                      className={cn(
                        "tabular shrink-0 text-[11px]",
                        error ? "text-danger" : "text-muted-foreground",
                      )}
                    >
                      {r.actual}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{r.message}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div
        key={daysOffShaking ? `days-off-${shake!.nonce}` : "days-off"}
        className={cn(
          "flex items-center gap-2 rounded-lg border p-2.5 text-sm",
          daysOffOk && !daysOffShaking ? "border-border bg-card" : "border-danger/40 bg-danger-muted/60",
          daysOffShaking && "animate-rule-shake ring-1 ring-danger",
        )}
      >
        {daysOffOk && !daysOffShaking ? (
          <CircleCheck className="size-4 shrink-0 text-success" />
        ) : (
          <CircleX className="size-4 shrink-0 text-danger" />
        )}
        <span className="font-medium">Days off</span>
        <span className="tabular ml-auto text-[11px] text-muted-foreground">
          {daysOffCount} of {maxDaysOff} used
        </span>
      </div>
    </div>
  );
}
