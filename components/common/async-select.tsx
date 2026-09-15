"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { autoFocusSearch } from "@/lib/pointer";
import { cn } from "@/lib/utils";

export type AsyncSelectOption = { value: string; label: string };

export interface AsyncOptionsResult {
  options: AsyncSelectOption[];
  isPending: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

export type UseAsyncOptions = (search: string, enabled: boolean) => AsyncOptionsResult;

export function useDebouncedValue(raw: string, delayMs = 300): string {
  const [value, setValue] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setValue(raw.trim()), delayMs);
    return () => clearTimeout(timer);
  }, [raw, delayMs]);
  return value;
}

export function nearBottom(element: HTMLDivElement): boolean {
  return element.scrollTop + element.clientHeight >= element.scrollHeight - 24;
}

export function AsyncSelect({
  value,
  onChange,
  useOptions,
  selectedLabel,
  leadingOptions = [],
  placeholder,
  searchPlaceholder,
  emptyLabel = "-",
  id,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  useOptions: UseAsyncOptions;
  selectedLabel?: string;
  leadingOptions?: AsyncSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  id?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [rawQuery, setRawQuery] = useState("");
  const query = useDebouncedValue(rawQuery);
  const result = useOptions(query, open);
  const options = [...leadingOptions, ...result.options];
  const triggerLabel = selectedLabel || options.find((option) => option.value === value)?.label || "";

  const listRef = useRef<HTMLDivElement>(null);
  const onScroll = () => {
    const element = listRef.current;
    if (!element || !result.hasNextPage || result.isFetchingNextPage) return;
    if (nearBottom(element)) result.fetchNextPage();
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setRawQuery("");
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="lg"
            id={id}
            aria-label={ariaLabel}
            className="w-full justify-between font-normal"
          />
        }
      >
        <span className={cn("truncate", !triggerLabel && "text-muted-foreground")}>
          {triggerLabel || placeholder}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-70" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) p-1">
        <div className="relative flex items-center px-1 pt-1">
          <Search className="pointer-events-none absolute start-3.5 size-4 text-muted-foreground" />
          <Input
            size="sm"
            autoFocus={autoFocusSearch()}
            placeholder={searchPlaceholder}
            value={rawQuery}
            onChange={(event) => setRawQuery(event.target.value)}
            className="ps-8"
          />
        </div>
        <div ref={listRef} onScroll={onScroll} className="mt-1 max-h-56 overflow-y-auto">
          <div className="flex flex-col gap-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setRawQuery("");
                  setOpen(false);
                }}
                className={cn(
                  "relative flex w-full cursor-pointer items-center rounded-md py-2 pe-8 ps-2.5 text-start text-sm transition-colors select-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                  option.value === value && "bg-accent font-medium text-accent-foreground hover:bg-accent",
                )}
              >
                <span className="flex-1 truncate">{option.label}</span>
                {option.value === value && (
                  <span className="pointer-events-none absolute end-2 flex size-4 items-center justify-center">
                    <Check className="size-4 text-primary" />
                  </span>
                )}
              </button>
            ))}
            {result.isPending && (
              <div className="flex justify-center py-4">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!result.isPending && result.options.length === 0 && (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">{emptyLabel}</p>
            )}
            {result.isFetchingNextPage && (
              <div className="flex justify-center py-2">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AsyncMultiFilter({
  value,
  onChange,
  useOptions,
  searchLabel,
  emptyLabel = "-",
}: {
  value: string[];
  onChange: (next: string[] | undefined) => void;
  useOptions: UseAsyncOptions;
  searchLabel?: string;
  emptyLabel?: string;
}) {
  const [rawQuery, setRawQuery] = useState("");
  const query = useDebouncedValue(rawQuery);
  const { options, isPending, hasNextPage, isFetchingNextPage, fetchNextPage } = useOptions(query, true);

  const listRef = useRef<HTMLDivElement>(null);
  const onScroll = () => {
    const element = listRef.current;
    if (!element || !hasNextPage || isFetchingNextPage) return;
    if (nearBottom(element)) fetchNextPage();
  };
  const toggle = (optionValue: string) => {
    const next = value.includes(optionValue)
      ? value.filter((entry) => entry !== optionValue)
      : [...value, optionValue];
    onChange(next.length ? next : undefined);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute start-2.5 size-4 text-muted-foreground" />
        <Input
          size="sm"
          autoFocus={autoFocusSearch()}
          placeholder={searchLabel}
          value={rawQuery}
          onChange={(event) => setRawQuery(event.target.value)}
          className="ps-8"
        />
      </div>
      <div ref={listRef} onScroll={onScroll} className="max-h-52 overflow-y-auto">
        <div className="flex flex-col gap-0.5">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1.5 text-start text-sm transition-colors hover:bg-muted"
            >
              <Checkbox checked={value.includes(option.value)} onCheckedChange={() => toggle(option.value)} />
              <span className="truncate">{option.label}</span>
            </label>
          ))}
          {isPending && (
            <div className="flex justify-center py-4">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isPending && options.length === 0 && (
            <div className="px-1.5 py-2 text-center text-xs text-muted-foreground">{emptyLabel}</div>
          )}
          {isFetchingNextPage && (
            <div className="flex justify-center py-2">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
