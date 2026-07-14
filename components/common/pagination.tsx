import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const btn =
    "inline-flex size-8 items-center justify-center rounded-md border transition-colors disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:bg-accent enabled:hover:text-accent-foreground";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
      <span className="font-mono text-xs text-muted-foreground tabular">
        {total === 0 ? `0 ${label}` : `${start}–${end} of ${total} ${label}`}
      </span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onPrev} disabled={page <= 1} className={btn} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </button>
        <span className="font-mono text-xs text-muted-foreground tabular">
          Page {Math.min(page, pageCount)} / {pageCount}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= pageCount}
          className={cn(btn)}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
