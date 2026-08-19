"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, Filter, Search } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/common/pagination";
import { Switch } from "@/components/common/toggle-switch";
import { cn } from "@/lib/utils";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    headClassName?: string;
    cellClassName?: string;
    filter?: "text" | "select" | "range";
    filterOptions?: { value: string; label: string }[];
    filterLabel?: string;
  }
}

export const selectFilterFn: FilterFn<unknown> = (row, columnId, value) =>
  !Array.isArray(value) || value.length === 0 || value.includes(String(row.getValue(columnId)));

type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  searchPlaceholder: string;
  emptyLabel: string;
  itemsLabel: string;
  pageSize?: number;
  onRowClick?: (row: TData) => void;
  rowAriaLabel?: (row: TData) => string;
  getSearchText?: (row: TData) => string;
  toolbar?: ReactNode;
  filterLabels?: { filter?: string; clear?: string; min?: string; max?: string };
  enableFreeze?: boolean;
  maxFreeze?: number;
  freezeLabels?: { label?: string; toggle?: string };
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

function SelectFilter<TData>({ column }: { column: Column<TData, unknown> }) {
  const value = (column.getFilterValue() as string[] | undefined) ?? [];
  const options =
    column.columnDef.meta?.filterOptions ??
    [...column.getFacetedUniqueValues().keys()]
      .filter((v) => v != null && v !== "")
      .map((v) => ({ value: String(v), label: String(v) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  const toggle = (v: string) => {
    const next = value.includes(v) ? value.filter((x) => x !== v) : [...value, v];
    column.setFilterValue(next.length ? next : undefined);
  };
  return (
    <div className="flex max-h-52 flex-col gap-0.5 overflow-auto">
      {options.map((o) => (
        <label
          key={o.value}
          className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted"
        >
          <input
            type="checkbox"
            checked={value.includes(o.value)}
            onChange={() => toggle(o.value)}
            className="size-3.5 accent-[var(--primary)]"
          />
          {o.label}
        </label>
      ))}
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
    kind === "range"
      ? Array.isArray(value) && (value[0] != null || value[1] != null)
      : kind === "select"
        ? Array.isArray(value) && value.length > 0
        : Boolean(value);
  return (
    <Popover>
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
      >
        <Filter className="size-3.5" />
        {active && (
          <span className="absolute -end-0.5 -top-0.5 size-1.5 rounded-full bg-primary" />
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 space-y-2 p-3">
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
        {kind === "select" && <SelectFilter column={column} />}
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
  getSearchText,
  toolbar,
  filterLabels = {},
  enableFreeze = false,
  maxFreeze = 3,
  freezeLabels = {},
}: DataTableProps<TData>) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [freezeCount, setFreezeCount] = useState(1);
  const [freezeOn, setFreezeOn] = useState(false);

  const resolvedColumns = useMemo(
    () =>
      columns.map((c) =>
        c.meta?.filter === "select" && !c.filterFn
          ? { ...c, filterFn: selectFilterFn as FilterFn<TData> }
          : c,
      ),
    [columns],
  );

  const columnIds = resolvedColumns.map(
    (c) => c.id ?? ("accessorKey" in c ? String((c as { accessorKey: unknown }).accessorKey) : ""),
  );
  const effectiveMax = Math.min(maxFreeze, columnIds.length - 1);
  const pinnedLeft = freezeOn ? columnIds.slice(0, Math.min(freezeCount, effectiveMax)) : [];

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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="relative flex w-full max-w-sm items-center">
          <Search className="pointer-events-none absolute start-2.5 size-4 text-muted-foreground" />
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 w-full rounded-lg border bg-card ps-8 pe-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </label>
        <div className="flex items-center gap-2">
          {enableFreeze && effectiveMax > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{freezeLabels.label ?? "Freeze"}</span>
              <Select
                value={String(Math.min(Math.max(freezeCount, 1), effectiveMax))}
                onValueChange={(v) => v != null && setFreezeCount(Number(v))}
              >
                <SelectTrigger className="w-[64px]">
                  <SelectValue>{(v) => v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: effectiveMax }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Switch
                checked={freezeOn}
                onCheckedChange={setFreezeOn}
                aria-label={freezeLabels.toggle ?? freezeLabels.label ?? "Freeze"}
              />
            </div>
          )}
          {toolbar}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const pinned = header.column.getIsPinned() === "left";
                  const lastPinned = pinned && pinnedLeft[pinnedLeft.length - 1] === header.column.id;
                  const label = header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext());
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        header.column.columnDef.meta?.headClassName,
                        pinned && "sticky z-20 bg-card",
                        lastPinned && "border-e border-border",
                      )}
                      style={
                        pinned
                          ? {
                              insetInlineStart: header.column.getStart("left"),
                              width: header.column.getSize(),
                              minWidth: header.column.getSize(),
                              maxWidth: header.column.getSize(),
                            }
                          : undefined
                      }
                      aria-sort={
                        sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                            ? "descending"
                            : undefined
                      }
                    >
                      <span className="group/head inline-flex items-center gap-1">
                        {header.column.getCanSort() ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="inline-flex cursor-pointer items-center gap-1 select-none transition-colors hover:text-foreground"
                          >
                            {label}
                            {sorted === "asc" ? (
                              <ArrowUp className="size-3.5 text-primary" />
                            ) : sorted === "desc" ? (
                              <ArrowDown className="size-3.5 text-primary" />
                            ) : (
                              <ChevronsUpDown className="size-3.5 opacity-0 transition-opacity group-hover/head:opacity-40" />
                            )}
                          </button>
                        ) : (
                          label
                        )}
                        <ColumnFilter column={header.column} labels={filterLabels} />
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
                        lastPinned && "border-e border-border",
                      )}
                      style={
                        pinned
                          ? {
                              insetInlineStart: cell.column.getStart("left"),
                              width: cell.column.getSize(),
                              minWidth: cell.column.getSize(),
                              maxWidth: cell.column.getSize(),
                            }
                          : undefined
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            {total === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={colCount} className="py-10 text-center text-sm text-muted-foreground">
                  {emptyLabel}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
  );
}
