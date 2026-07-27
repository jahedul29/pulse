"use client";

import { useState } from "react";
import { addDays, addWeeks, format, startOfWeek } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function mondayOf(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function WeekNav({
  weekStart,
  onChange,
}: {
  weekStart: Date;
  onChange: (weekStart: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const label = sameMonth
    ? `${format(weekStart, "d")} – ${format(weekEnd, "d MMM yyyy")}`
    : `${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM yyyy")}`;

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => onChange(addWeeks(weekStart, -1))}
        aria-label="Previous week"
      >
        <ChevronLeft />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button variant="outline" size="sm" className="min-w-44 justify-center gap-1.5" />}>
          <CalendarDays className="size-3.5" />
          <span className="tabular">{label}</span>
        </PopoverTrigger>
        <PopoverContent align="center" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={weekStart}
            defaultMonth={weekStart}
            captionLayout="dropdown"
            onSelect={(date) => {
              if (date) {
                onChange(mondayOf(date));
                setOpen(false);
              }
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => onChange(addWeeks(weekStart, 1))}
        aria-label="Next week"
      >
        <ChevronRight />
      </Button>

      <Button variant="ghost" size="sm" onClick={() => onChange(mondayOf(new Date()))}>
        Today
      </Button>
    </div>
  );
}
