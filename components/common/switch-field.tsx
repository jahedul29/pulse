"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/common/toggle-switch";
import { CONTROL_HEIGHT } from "@/components/ui/control-size";
import { cn } from "@/lib/utils";

export function SwitchField({
  label,
  checked,
  onCheckedChange,
  checkedLabel,
  uncheckedLabel,
  description,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  checkedLabel?: string;
  uncheckedLabel?: string;
  description?: string;
}) {
  if (description) {
    return (
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-input px-3 py-2.5">
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </span>
        <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
      </label>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <label
        className={cn(
          "flex w-full cursor-pointer items-center justify-between rounded-lg border border-input bg-transparent px-3",
          CONTROL_HEIGHT.md,
        )}
      >
        <span className="text-sm">{checked ? checkedLabel : uncheckedLabel}</span>
        <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
      </label>
    </div>
  );
}
