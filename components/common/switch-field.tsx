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
  disabled,
  ariaLabel,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  checkedLabel?: string;
  uncheckedLabel?: string;
  description?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  if (description) {
    return (
      <label className="group/switch-field flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-input px-3 py-2.5 has-[:disabled]:cursor-not-allowed">
        <span className="flex flex-col gap-0.5 transition-opacity group-has-[:disabled]/switch-field:opacity-60">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </span>
        <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} aria-label={ariaLabel ?? label} />
      </label>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <label
        className={cn(
          "group/switch-field flex w-full cursor-pointer items-center justify-between rounded-lg border border-input bg-transparent px-3 has-[:disabled]:cursor-not-allowed",
          CONTROL_HEIGHT.md,
        )}
      >
        <span className="text-sm transition-opacity group-has-[:disabled]/switch-field:opacity-60">
          {checked ? checkedLabel : uncheckedLabel}
        </span>
        <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} aria-label={ariaLabel ?? label} />
      </label>
    </div>
  );
}
