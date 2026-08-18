"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function AnnualLegend({
  expanded,
  onToggleExpanded,
}: {
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const t = useTranslations("annual.legend");
  const items = [
    {
      key: "available",
      label: t("availableLabel"),
      sub: t("availableSub"),
      desc: t("availableDesc"),
    },
    {
      key: "unavailable",
      label: t("unavailableLabel"),
      sub: null as string | null,
      desc: t("unavailableDesc"),
    },
  ];
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="grid w-full max-w-2xl grid-cols-2 gap-2 sm:gap-3">
        {items.map((item) => {
          const unavailable = item.key === "unavailable";
          return (
            <div key={item.key} className="flex w-full flex-col items-center text-center">
              <div
                className={cn(
                  "relative flex h-10 w-full flex-col items-center justify-center overflow-hidden rounded-[10px] px-2 text-xs leading-tight font-semibold sm:px-4 md:text-sm",
                  unavailable ? "bg-danger text-danger-foreground" : "text-foreground",
                )}
              >
                {!unavailable && (
                  <svg
                    aria-hidden
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    viewBox="0 0 163 40"
                    preserveAspectRatio="none"
                  >
                    <rect width="163" height="40" fill="var(--muted)" />
                    <path
                      d="M2.06975 35.866L162.158 3.64062C162.658 11.1828 162.745 24.2615 162.158 31.6063C161.67 37.7055 155.228 40.1884 152.515 40.0046C107.053 39.9867 14.9512 39.9615 10.2404 40.0046C5.52959 40.0477 2.83046 37.2635 2.06975 35.866Z"
                      fill="var(--border-strong)"
                    />
                  </svg>
                )}
                <span className="relative z-10">{item.label}</span>
                {item.sub && (
                  <span className="relative z-10 text-[9px] font-medium md:text-[11px]">
                    {item.sub}
                  </span>
                )}
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
