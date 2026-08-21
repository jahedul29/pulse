"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  pageCount,
  total,
  start,
  end,
  onPrev,
  onNext,
  label = "items",
}: {
  page: number;
  pageCount: number;
  total: number;
  start: number;
  end: number;
  onPrev: () => void;
  onNext: () => void;
  label?: string;
}) {
  const t = useTranslations("pagination");
  const btn =
    "inline-flex size-8 cursor-pointer items-center justify-center rounded-md border transition-colors disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:bg-accent enabled:hover:text-accent-foreground";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
      <span className="text-xs text-muted-foreground tabular">
        {total === 0 ? t("rangeEmpty", { label }) : t("range", { start, end, total, label })}
      </span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onPrev} disabled={page <= 1} className={btn} aria-label={t("prev")}>
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-xs text-muted-foreground tabular">
          {t("page", { page: Math.min(page, pageCount), count: pageCount })}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= pageCount}
          className={cn(btn)}
          aria-label={t("next")}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
