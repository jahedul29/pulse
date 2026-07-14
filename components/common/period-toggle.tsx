"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { PERIODS, coercePeriod } from "@/lib/period";
import { cn } from "@/lib/utils";

export function PeriodToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const active = coercePeriod(params.get("period"));

  const select = useCallback(
    (value: string) => {
      const next = new URLSearchParams(params.toString());
      next.set("period", value);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  return (
    <div className="inline-flex items-center rounded-lg border bg-card p-0.5">
      {PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => select(p)}
          aria-pressed={active === p}
          className={cn(
            "rounded-md px-2.5 py-1 font-mono text-xs font-medium transition-colors",
            active === p
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
