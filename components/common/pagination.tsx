"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function pageItems(current: number, count: number): (number | string)[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const pages = new Set<number>([1, count, current]);
  for (let page = current - 1; page <= current + 1; page++)
    if (page >= 1 && page <= count) pages.add(page);
  const sorted = [...pages].sort((first, second) => first - second);
  const out: (number | string)[] = [];
  sorted.forEach((page, i) => {
    if (i > 0 && page - sorted[i - 1] > 1) out.push(`gap-${page}`);
    out.push(page);
  });
  return out;
}

export function Pagination({
  page,
  pageCount,
  total,
  start,
  end,
  pageSize,
  onPage,
  onPageSize,
  pageSizeOptions,
  label = "items",
}: {
  page: number;
  pageCount: number;
  total: number;
  start: number;
  end: number;
  pageSize?: number;
  onPage: (page: number) => void;
  onPageSize?: (size: number) => void;
  pageSizeOptions?: number[];
  label?: string;
}) {
  const t = useTranslations("pagination");
  const current = Math.min(page, pageCount);
  const [jump, setJump] = useState("");
  const submitJump = () => {
    const parsed = Number(jump);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= pageCount) onPage(parsed);
    setJump("");
  };
  const btn =
    "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border text-xs tabular transition-colors disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:bg-accent enabled:hover:text-accent-foreground";

  return (
    <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4">
      <div className="flex items-center justify-between gap-4 sm:justify-start">
        <span className="text-xs text-muted-foreground tabular">
          {total === 0 ? t("rangeEmpty", { label }) : t("range", { start, end, total, label })}
        </span>
        {onPageSize && pageSize != null && pageSizeOptions && pageSizeOptions.length > 1 && (
          <label className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">{t("rowsPerPage")}</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => value && onPageSize(Number(value))}
            >
              <SelectTrigger size="sm" className="w-[4.75rem]">
                <SelectValue>{(value) => String(value)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-2">
        {pageCount > 7 && (
          <div className="hidden items-center gap-1.5 sm:flex">
            <span className="text-xs text-muted-foreground">{t("goToLabel")}</span>
            <input
              type="number"
              min={1}
              max={pageCount}
              inputMode="numeric"
              value={jump}
              onChange={(event) => setJump(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && submitJump()}
              onBlur={submitJump}
              aria-label={t("goToLabel")}
              placeholder="#"
              className="h-8 w-14 rounded-md border bg-card px-2 text-xs tabular outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        )}
        <div className="flex flex-1 items-center justify-between gap-1 sm:flex-none sm:justify-end">
        <button
          type="button"
          onClick={() => onPage(current - 1)}
          disabled={current <= 1}
          className={btn}
          aria-label={t("prev")}
        >
          <ChevronLeft className="size-4 rtl:-scale-x-100" />
        </button>

        <div className="flex items-center gap-1">
          {pageItems(current, pageCount).map((item) =>
            typeof item === "number" ? (
              <button
                key={item}
                type="button"
                onClick={() => onPage(item)}
                aria-current={item === current ? "page" : undefined}
                aria-label={t("goTo", { page: item })}
                className={cn(
                  btn,
                  item === current &&
                    "border-primary bg-primary text-primary-foreground enabled:hover:bg-primary enabled:hover:text-primary-foreground",
                )}
              >
                {item}
              </button>
            ) : (
              <span key={item} className="px-1 text-xs text-muted-foreground/60">
                …
              </span>
            ),
          )}
        </div>

        <button
          type="button"
          onClick={() => onPage(current + 1)}
          disabled={current >= pageCount}
          className={btn}
          aria-label={t("next")}
        >
          <ChevronRight className="size-4 rtl:-scale-x-100" />
        </button>
        </div>
      </div>
    </div>
  );
}
