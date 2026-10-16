"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/common/toggle-switch";
import type { ShapeRule } from "@/lib/region-builder/cells-in-shape";
import type { SelectionMode } from "@/lib/region-builder/modes";

export const SELECTION_MODES: SelectionMode[] = ["toggle", "add", "remove"];

export const SelectionOptions = memo(function SelectionOptions({
  mode,
  onModeChange,
  rule,
  onRuleChange,
  lockReason,
}: {
  mode: SelectionMode;
  onModeChange: (mode: SelectionMode) => void;
  rule: ShapeRule;
  onRuleChange: (rule: ShapeRule) => void;
  lockReason: string | null;
}) {
  const t = useTranslations("locations.editor");
  const disabled = lockReason !== null;
  return (
    <>
      <fieldset className="flex flex-col gap-1.5" disabled={disabled}>
        <legend className="mb-1.5 text-xs text-muted-foreground">{t("modeLabel")}</legend>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-0.5">
          {SELECTION_MODES.map((value) => (
            <label
              key={value}
              className="flex h-7 cursor-pointer items-center justify-center rounded-md px-1 text-center text-xs font-medium text-muted-foreground transition-colors has-[:checked]:bg-card has-[:checked]:text-foreground has-[:checked]:shadow-sm has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40"
            >
              <input
                type="radio"
                name="region-editor-mode"
                value={value}
                checked={mode === value}
                onChange={() => onModeChange(value)}
                className="sr-only"
              />
              {t(`mode_${value}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex cursor-pointer items-start justify-between gap-3 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{t("touchRule")}</span>
          <span className="text-xs text-pretty text-muted-foreground">{t("touchRuleHint")}</span>
        </span>
        <Switch
          checked={rule === "touch"}
          onCheckedChange={(checked) => onRuleChange(checked ? "touch" : "centre")}
          disabled={disabled}
          aria-label={t("touchRule")}
        />
      </label>
      {lockReason ? <p className="text-xs text-pretty text-muted-foreground">{lockReason}</p> : null}
    </>
  );
});
