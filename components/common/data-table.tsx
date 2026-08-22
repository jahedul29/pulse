"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, CalendarIcon, ChevronsUpDown, Filter, FilterX, Pin, Search } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/common/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDragScroll } from "@/lib/use-drag-scroll";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    headClassName?: string;
    cellClassName?: string;
    filter?: "text" | "select" | "range" | "dateRange";
    filterOptions?: { value: string; label: string }[];
    filterLabel?: string;
  }
}

export const toolbarIconButtonClass = "max-sm:w-[42px] max-sm:px-0";

export const selectFilterFn: FilterFn<unknown> = (row, columnId, value) =>
  !Array.isArray(value) || value.length === 0 || value.includes(String(row.getValue(columnId)));

export const dateRangeFilterFn: FilterFn<unknown> = (row, columnId, value) => {
  if (!Array.isArray(value)) return true;
  const [min, max] = value as [number?, number?];
  const v = Number(row.getValue(columnId));
  if (min != null && v < min) return false;
  if (max != null && v > max) return false;
  return true;
};

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function endOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}
function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function cellSizeStyle<TData>(column: Column<TData, unknown>, pinned: boolean): CSSProperties | undefined {
  const explicit = column.columnDef.size != null;
  if (!pinned && !explicit) return undefined;
  const w = column.getSize();
  const style: CSSProperties = { width: w, minWidth: w, maxWidth: w };
  if (pinned) style.insetInlineStart = column.getStart("left");
  return style;
}

type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  searchPlaceholder: string;
  emptyLabel: string;
  itemsLabel: string;
  pageSize?: number;
  onRowClick?: (row: TData) => void;
  rowAriaLabel?: (row: TData) => string;
  rowClassName?: (row: TData) => string | undefined;
  getSearchText?: (row: TData) => string;
  toolbar?: ReactNode;
  filterLabels?: {
    filter?: string;
    clear?: string;
    clearFilters?: string;
    min?: string;
    max?: string;
    search?: string;
    from?: string;
    to?: string;
  };
  enableFreeze?: boolean;
  maxFreeze?: number;
};

function RangeFilter<TData>({
  column,
  labels,
}: {
  column: Column<TData, unknown>;
  labels: { min?: string; max?: string };
}) {
  const [min, max] = (column.getFilterValue() as [number?, number?] | undefined) ?? [];
  const set = (i: 0 | 1, raw: string) => {
    const num = raw === "" ? undefined : Number(raw);
    const next: [number?, number?] = [i === 0 ? num : min, i === 1 ? num : max];
    column.setFilterValue(next[0] == null && next[1] == null ? undefined : next);
  };
  const inputCls =
    "h-8 w-full rounded-md border bg-card px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        placeholder={labels.min ?? "Min"}
        value={min ?? ""}
        onChange={(e) => set(0, e.target.value)}
        className={inputCls}
      />
      <span className="text-muted-foreground">–</span>
      <input
        type="number"
        placeholder={labels.max ?? "Max"}
        value={max ?? ""}
        onChange={(e) => set(1, e.target.value)}
        className={inputCls}
      />
    </div>
  );
}

function SelectFilter<TData>({
  column,
  searchLabel,
}: {
  column: Column<TData, unknown>;
  searchLabel?: string;
}) {
  const [q, setQ] = useState("");
  const value = (column.getFilterValue() as string[] | undefined) ?? [];
  const options =
    column.columnDef.meta?.filterOptions ??
    [...column.getFacetedUniqueValues().keys()]
      .filter((v) => v != null && v !== "")
      .map((v) => ({ value: String(v), label: String(v) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  const shown = options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (v: string) => {
    const next = value.includes(v) ? value.filter((x) => x !== v) : [...value, v];
    column.setFilterValue(next.length ? next : undefined);
  };
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute start-2.5 size-4 text-muted-foreground" />
        <Input
          size="sm"
          autoFocus
          placeholder={searchLabel}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="ps-8"
        />
      </div>
      <div className="max-h-52 overflow-y-auto">
        <div className="flex flex-col gap-0.5">
        {shown.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1.5 text-start text-sm transition-colors hover:bg-muted"
          >
            <Checkbox
              checked={value.includes(o.value)}
              onCheckedChange={() => toggle(o.value)}
            />
            <span className="truncate">{o.label}</span>
          </label>
        ))}
        {shown.length === 0 && (
          <div className="px-1.5 py-2 text-center text-xs text-muted-foreground">—</div>
        )}
        </div>
      </div>
    </div>
  );
}

function DateFilterField({
  value,
  onChange,
  placeholder,
}: {
  value: number | undefined;
  onChange: (ms: number | undefined) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const selected = value != null ? new Date(value) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="lg"
            className={cn("w-full justify-between font-normal", value == null && "text-muted-foreground")}
          />
        }
      >
        {selected ? fmtDate(toIso(selected), locale) : placeholder}
        <CalendarIcon className="size-4 opacity-70" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? undefined}
          onSelect={(date) => {
            onChange(date ? date.getTime() : undefined);
            setOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function DateRangeFilter<TData>({
  column,
  labels,
}: {
  column: Column<TData, unknown>;
  labels: { from?: string; to?: string };
}) {
  const [min, max] = (column.getFilterValue() as [number?, number?] | undefined) ?? [];
  const set = (which: "min" | "max", ms: number | undefined) => {
    const nextMin = which === "min" ? (ms == null ? undefined : startOfDay(ms)) : min;
    const nextMax = which === "max" ? (ms == null ? undefined : endOfDay(ms)) : max;
    column.setFilterValue(nextMin == null && nextMax == null ? undefined : [nextMin, nextMax]);
  };
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-xs">{labels.from ?? "From"}</span>
        <DateFilterField value={min} onChange={(ms) => set("min", ms)} placeholder={labels.from ?? "From"} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs">{labels.to ?? "To"}</span>
        <DateFilterField value={max} onChange={(ms) => set("max", ms)} placeholder={labels.to ?? "To"} />
      </label>
    </div>
  );
}

function ColumnFilter<TData>({
  column,
  labels,
}: {
  column: Column<TData, unknown>;
  labels: NonNullable<DataTableProps<TData>["filterLabels"]>;
}) {
  const kind = column.columnDef.meta?.filter;
  if (!kind) return null;
  const value = column.getFilterValue();
  const active =
    kind === "range" || kind === "dateRange"
      ? Array.isArray(value) && (value[0] != null || value[1] != null)
      : kind === "select"
        ? Array.isArray(value) && value.length > 0
        : Boolean(value);
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              aria-label={[labels.filter ?? "Filter", column.columnDef.meta?.filterLabel]
                .filter(Boolean)
                .join(" — ")}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "relative inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md transition-all focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                active
                  ? "bg-primary/10 text-primary opacity-100"
                  : "text-muted-foreground opacity-0 max-md:opacity-100 group-hover/head:opacity-60 hover:bg-muted hover:text-foreground hover:!opacity-100",
              )}
            />
          }
        >
          <Filter className="size-3.5" />
          {active && (
            <span className="absolute -end-0.5 -top-0.5 size-1.5 rounded-full bg-primary" />
          )}
        </TooltipTrigger>
        <TooltipContent>{labels.filter ?? "Filter"}</TooltipContent>
      </Tooltip>
      <PopoverContent align="start" className="w-56 gap-2 p-3">
        {column.columnDef.meta?.filterLabel && (
          <div className="text-xs font-medium text-muted-foreground">
            {column.columnDef.meta.filterLabel}
          </div>
        )}
        {kind === "text" && (
          <input
            autoFocus
            value={(value as string) ?? ""}
            onChange={(e) => column.setFilterValue(e.target.value || undefined)}
            className="h-8 w-full rounded-md border bg-card px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        )}
        {kind === "range" && <RangeFilter column={column} labels={labels} />}
        {kind === "dateRange" && <DateRangeFilter column={column} labels={labels} />}
        {kind === "select" && <SelectFilter column={column} searchLabel={labels.search} />}
        {active && (
          <button
            type="button"
            onClick={() => column.setFilterValue(undefined)}
            className="cursor-pointer text-xs text-primary hover:underline"
          >
            {labels.clear ?? "Clear"}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function DataTable<TData>({
  columns,
  data,
  searchPlaceholder,
  emptyLabel,
  itemsLabel,
  pageSize = 8,
  onRowClick,
  rowAriaLabel,
  rowClassName,
  getSearchText,
  toolbar,
  filterLabels = {},
  enableFreeze = false,
  maxFreeze = 3,
}: DataTableProps<TData>) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [freezeCount, setFreezeCount] = useState(0);
  const [rowH, setRowH] = useState(0);
  const tf = useTranslations("common");

  const resolvedColumns = useMemo(
    () =>
      columns.map((c) => {
        if (c.filterFn) return c;
        if (c.meta?.filter === "select") return { ...c, filterFn: selectFilterFn as FilterFn<TData> };
        if (c.meta?.filter === "dateRange")
          return { ...c, filterFn: dateRangeFilterFn as FilterFn<TData> };
        return c;
      }),
    [columns],
  );

  const columnIds = resolvedColumns.map(
    (c) => c.id ?? ("accessorKey" in c ? String((c as { accessorKey: unknown }).accessorKey) : ""),
  );
  const effectiveMax = Math.min(maxFreeze, columnIds.length - 1);
  const pinnedLeft = freezeCount > 0 ? columnIds.slice(0, Math.min(freezeCount, effectiveMax)) : [];

  const table = useReactTable({
    data,
    columns: resolvedColumns,
    state: { globalFilter, sorting, columnFilters, columnPinning: { left: pinnedLeft, right: [] } },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    enableColumnPinning: true,
    sortDescFirst: false,
    globalFilterFn: getSearchText
      ? (row, _columnId, value) =>
          getSearchText(row.original).toLowerCase().includes(String(value).toLowerCase())
      : "includesString",
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const { pageIndex, pageSize: size } = table.getState().pagination;
  const total = table.getFilteredRowModel().rows.length;
  const pageRows = table.getRowModel().rows;
  const start = total === 0 ? 0 : pageIndex * size + 1;
  const end = Math.min(pageIndex * size + size, total);
  const colCount = table.getAllLeafColumns().length;
  const activeFilterCount = columnFilters.length + (globalFilter.trim() ? 1 : 0);
  const clearAllFilters = () => {
    setColumnFilters([]);
    setGlobalFilter("");
  };
  const togglePin = (colIndex: number) =>
    setFreezeCount(colIndex < freezeCount ? colIndex : colIndex + 1);

  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ atStart: true, atEnd: true });
  const [bar, setBar] = useState({ overflow: false, leftPct: 0, widthPct: 100 });
  const [dragging, setDragging] = useState(false);
  const syncEdge = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const x = Math.abs(el.scrollLeft);
    setEdge({ atStart: x <= 1, atEnd: max <= 1 || x >= max - 1 });
    setBar({
      overflow: max > 1,
      widthPct: Math.max(8, (el.clientWidth / el.scrollWidth) * 100),
      leftPct: (x / el.scrollWidth) * 100,
    });
  }, []);
  const onThumbDown = (e: ReactPointerEvent) => {
    e.preventDefault();
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    setDragging(true);
    const startX = e.clientX;
    const startLeft = el.scrollLeft;
    const ratio = el.scrollWidth / track.clientWidth;
    const onMove = (ev: PointerEvent) => {
      el.scrollLeft = startLeft + (ev.clientX - startX) * ratio;
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    syncEdge();
    const dataRow = el.querySelector("tbody tr[data-row]");
    if (dataRow) {
      const h = dataRow.getBoundingClientRect().height;
      setRowH((prev) => (Math.abs(prev - h) > 0.5 ? h : prev));
    }
    const ro = new ResizeObserver(syncEdge);
    ro.observe(el);
    return () => ro.disconnect();
  }, [syncEdge, pageRows.length, colCount, freezeCount]);

  useDragScroll(scrollRef);

  return (
    <TooltipProvider>
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="relative flex min-w-0 flex-1 items-center max-w-sm">
          <Search className="pointer-events-none absolute start-2.5 size-4 text-muted-foreground" />
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 w-full rounded-lg border bg-card ps-8 pe-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </label>
        <div className="flex items-center gap-2 ms-auto">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="destructive"
                  size="lg"
                  onClick={clearAllFilters}
                  aria-label={filterLabels.clearFilters ?? "Clear filters"}
                  aria-hidden={activeFilterCount === 0}
                  tabIndex={activeFilterCount === 0 ? -1 : 0}
                  className={cn(
                    toolbarIconButtonClass,
                    "transition-opacity duration-200 motion-reduce:transition-none",
                    activeFilterCount === 0 && "pointer-events-none opacity-0",
                  )}
                />
              }
            >
              <FilterX className="size-4" />
              <span className="hidden sm:inline">{filterLabels.clearFilters ?? "Clear filters"}</span>
            </TooltipTrigger>
            <TooltipContent>{filterLabels.clearFilters ?? "Clear filters"}</TooltipContent>
          </Tooltip>
          {toolbar}
        </div>
      </div>

      <div data-no-os className="relative overflow-hidden rounded-lg border">
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 end-0 z-30 w-6 bg-gradient-to-l from-black/[0.06] to-transparent transition-opacity duration-200 rtl:bg-gradient-to-r motion-reduce:transition-none dark:from-black/35",
            edge.atEnd && "opacity-0",
          )}
        />
        {pinnedLeft.length === 0 && (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 start-0 z-30 w-6 bg-gradient-to-r from-black/[0.06] to-transparent transition-opacity duration-200 rtl:bg-gradient-to-l motion-reduce:transition-none dark:from-black/35",
              edge.atStart && "opacity-0",
            )}
          />
        )}
        <Table
          className="min-w-full table-fixed"
          containerClassName={cn(
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            bar.overflow && "cursor-grab",
          )}
          containerProps={{ ref: scrollRef, onScroll: syncEdge }}
        >
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const pinned = header.column.getIsPinned() === "left";
                  const lastPinned = pinned && pinnedLeft[pinnedLeft.length - 1] === header.column.id;
                  const colIndex = columnIds.indexOf(header.column.id);
                  const canPin = enableFreeze && colIndex >= 0 && colIndex < effectiveMax;
                  const isFrozen = colIndex >= 0 && colIndex < freezeCount;
                  const label = header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext());
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "group/head",
                        header.column.columnDef.meta?.headClassName,
                        pinned && "sticky z-20 bg-card",
                        lastPinned &&
                          "dt-freeze-divider",
                      )}
                      style={cellSizeStyle(header.column, pinned)}
                      aria-sort={
                        sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                            ? "descending"
                            : undefined
                      }
                    >
                      <span className="inline-flex items-center gap-1">
                        {header.column.getCanSort() ? (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <button
                                  type="button"
                                  onClick={header.column.getToggleSortingHandler()}
                                  className="inline-flex cursor-pointer items-center gap-1 select-none transition-colors hover:text-foreground"
                                />
                              }
                            >
                              {label}
                              {sorted === "asc" ? (
                                <ArrowUp className="size-3.5 text-primary" />
                              ) : sorted === "desc" ? (
                                <ArrowDown className="size-3.5 text-primary" />
                              ) : (
                                <ChevronsUpDown className="size-3.5 opacity-0 transition-opacity group-hover/head:opacity-40" />
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              {sorted === "asc"
                                ? tf("sortDesc")
                                : sorted === "desc"
                                  ? tf("sortClear")
                                  : tf("sortAsc")}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          label
                        )}
                        <ColumnFilter column={header.column} labels={filterLabels} />
                        {canPin && (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <button
                                  type="button"
                                  onClick={() => togglePin(colIndex)}
                                  aria-label={isFrozen ? tf("unfreeze") : tf("freezeToHere")}
                                  aria-pressed={isFrozen}
                                  className={cn(
                                    "inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded transition-opacity",
                                    isFrozen
                                      ? "text-primary"
                                      : "text-muted-foreground opacity-0 group-hover/head:opacity-60 hover:!opacity-100 focus-visible:opacity-100",
                                  )}
                                />
                              }
                            >
                              <Pin
                                className={cn(
                                  "size-3.5 transition-transform motion-reduce:transition-none",
                                  isFrozen && "rotate-45 fill-current",
                                )}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              {isFrozen ? tf("unfreeze") : tf("freezeToHere")}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </span>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {pageRows.map((row) => (
              <TableRow
                key={row.id}
                data-row
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick(row.original);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? "link" : undefined}
                aria-label={rowAriaLabel ? rowAriaLabel(row.original) : undefined}
                className={cn(
                  onRowClick &&
                    "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  rowClassName?.(row.original),
                )}
              >
                {row.getVisibleCells().map((cell) => {
                  const pinned = cell.column.getIsPinned() === "left";
                  const lastPinned = pinned && pinnedLeft[pinnedLeft.length - 1] === cell.column.id;
                  return (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        cell.column.columnDef.meta?.cellClassName,
                        pinned && "sticky z-10 bg-card",
                        lastPinned &&
                          "dt-freeze-divider",
                      )}
                      style={cellSizeStyle(cell.column, pinned)}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            {rowH > 0 && pageRows.length > 0 && pageRows.length < size && (
              <TableRow aria-hidden className="pointer-events-none border-transparent hover:bg-transparent">
                <TableCell colSpan={colCount} style={{ height: (size - pageRows.length) * rowH }} />
              </TableRow>
            )}
            {total === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={colCount} className="py-10 text-center text-sm text-muted-foreground">
                  {emptyLabel}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {bar.overflow && (
          <div className="border-t border-border bg-muted/40 px-0.5 py-0.5">
            <div ref={trackRef} className="relative h-1.5">
              <div
                aria-hidden
                onPointerDown={onThumbDown}
                className={cn(
                  "absolute inset-y-0 touch-none rounded-full transition-colors",
                  dragging
                    ? "cursor-grabbing bg-foreground/50"
                    : "cursor-grab bg-foreground/30 hover:bg-foreground/45",
                )}
                style={{ left: `${bar.leftPct}%`, width: `${bar.widthPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <Pagination
        page={pageIndex + 1}
        pageCount={table.getPageCount() || 1}
        total={total}
        start={start}
        end={end}
        onPrev={() => table.previousPage()}
        onNext={() => table.nextPage()}
        label={itemsLabel}
      />
    </div>
    </TooltipProvider>
  );
}
