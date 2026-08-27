"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Chip } from "@/components/common/chip";
import { autoFocusSearch } from "@/lib/pointer";
import { cn } from "@/lib/utils";

export type MultiSelectOption = { value: string; label: string };

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyLabel = "—",
  maxChips = 2,
  className,
}: {
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  maxChips?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const labelOf = useMemo(() => new Map(options.map((o) => [o.value, o.label])), [options]);
  const term = q.trim().toLowerCase();
  const shown = options.filter((o) => o.label.toLowerCase().includes(term));
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  const chips = value.slice(0, maxChips);
  const extra = value.length - chips.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="lg"
            className={cn("w-full justify-between font-normal", className)}
          />
        }
      >
        {value.length === 0 ? (
          <span className="text-muted-foreground">{placeholder}</span>
        ) : (
          <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            {chips.map((v) => (
              <Chip key={v}>{labelOf.get(v) ?? v}</Chip>
            ))}
            {extra > 0 && <Chip variant="soft">+{extra}</Chip>}
          </span>
        )}
        <ChevronsUpDown className="size-4 shrink-0 opacity-70" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) p-1.5">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute start-2.5 size-4 text-muted-foreground" />
          <Input
            size="sm"
            autoFocus={autoFocusSearch()}
            placeholder={searchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="ps-8"
          />
        </div>
        <div className="mt-1.5 max-h-56 overflow-y-auto">
          <div className="flex flex-col gap-0.5">
            {shown.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-start text-sm transition-colors hover:bg-muted"
              >
                <Checkbox checked={value.includes(o.value)} onCheckedChange={() => toggle(o.value)} />
                <span className="truncate">{o.label}</span>
              </label>
            ))}
            {shown.length === 0 && (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">{emptyLabel}</p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
