"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

function toDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export function DateField({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = toDate(value);
  const now = new Date();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn("h-9 w-full justify-between font-normal", !selected && "text-muted-foreground")}
          />
        }
      >
        {selected ? fmtDate(value!) : "Select date"}
        <CalendarIcon className="size-4 opacity-70" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? new Date(1995, 0)}
          captionLayout="dropdown"
          startMonth={new Date(1930, 0)}
          endMonth={now}
          disabled={{ after: now }}
          onSelect={(date) => {
            if (date) {
              onChange(toIso(date));
              setOpen(false);
            }
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
