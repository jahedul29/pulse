"use client";

import { Check } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function YearPickerDialog({
  open,
  onOpenChange,
  years,
  value,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  years: number[];
  value: number;
  onSelect: (year: number) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="theme-violet w-[300px] max-w-[300px] font-manrope sm:max-w-[300px]"
      >
        <DialogTitle className="border-b px-4 pt-5 pb-3 text-center text-sm font-bold text-foreground">
          Select the year
        </DialogTitle>
        <DialogBody className="p-4">
          <div className="flex flex-col gap-2">
            {years.map((year) => {
              const active = year === value;
              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => {
                    onSelect(year);
                    onOpenChange(false);
                  }}
                  className={cn(
                    "tabular flex h-11 items-center justify-between rounded-xl px-4 text-base font-bold transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-muted/70",
                  )}
                >
                  {year}
                  {active && <Check className="size-4" />}
                </button>
              );
            })}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
