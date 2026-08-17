"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  {
    key: "available",
    label: "Available",
    sub: "(as per weekly business hours)",
    desc: "Clients that need Therapy during these days will be able to find and book you",
  },
  {
    key: "unavailable",
    label: "Unavailable",
    sub: null,
    desc: "Clients that need Therapy during these days will not be able to find you",
  },
] as const;

export function AnnualLegend({
  expanded,
  onToggleExpanded,
}: {
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="grid w-full max-w-2xl grid-cols-2 gap-2 sm:gap-3">
        {ITEMS.map((item) => {
          const unavailable = item.key === "unavailable";
          return (
            <div key={item.key} className="flex w-full flex-col items-center text-center">
              <div
                className={cn(
                  "flex h-10 w-full flex-col items-center justify-center rounded-[10px] px-2 text-xs leading-tight font-semibold sm:px-4 md:text-sm",
                  unavailable
                    ? "bg-danger text-danger-foreground"
                    : "bg-muted text-muted-foreground ring-1 ring-inset ring-border-strong",
                )}
              >
                {item.label}
                {item.sub && <span className="text-[9px] font-medium md:text-[11px]">{item.sub}</span>}
              </div>
              <div
                className={cn(
                  "grid w-full overflow-hidden transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
                  expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <p
                  className={cn(
                    "min-h-0 overflow-hidden pt-1.5 text-[10px] leading-snug text-muted-foreground transition-opacity duration-300 md:text-xs motion-reduce:transition-none",
                    expanded ? "opacity-100" : "opacity-0",
                  )}
                >
                  {item.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onToggleExpanded}
        aria-label={expanded ? "Collapse" : "Expand"}
        className="-mt-1 flex h-7 w-12 cursor-pointer items-center justify-center rounded-full bg-card shadow-md ring-1 ring-foreground/10 transition-colors hover:bg-muted"
      >
        <ChevronDown
          className={cn(
            "size-5 stroke-[2.5] text-primary transition-transform duration-300 ease-out motion-reduce:transition-none",
            expanded && "rotate-180",
          )}
        />
      </button>
    </div>
  );
}
