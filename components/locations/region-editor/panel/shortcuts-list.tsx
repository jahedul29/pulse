"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { isApplePlatform } from "@/lib/platform";
import { EDITOR_TOOLS, TOOL_KEY_LABELS } from "@/lib/region-builder/tools";

function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="flex shrink-0 gap-1" dir="ltr">
      {keys.map((key) => (
        <kbd key={key} className="tabular min-w-6 rounded border bg-muted px-1.5 py-0.5 text-center text-xs font-medium">
          {key}
        </kbd>
      ))}
    </span>
  );
}

export const ShortcutsList = memo(function ShortcutsList() {
  const t = useTranslations("locations.editor");
  const modifier = isApplePlatform() ? "⌘" : "Ctrl";
  const rows: Array<{ label: string; keys: string[] }> = [
    ...EDITOR_TOOLS.map((tool) => ({ label: t(`tool_${tool}`), keys: [TOOL_KEY_LABELS[tool]] })),
    { label: t("shortcut_space"), keys: ["Space"] },
    { label: t("shortcut_escape"), keys: ["Esc"] },
    { label: t("shortcut_enter"), keys: ["Enter"] },
    { label: t("shortcut_backspace"), keys: ["⌫"] },
    { label: t("shortcut_undo"), keys: [modifier, "Z"] },
    { label: t("shortcut_redo"), keys: [modifier, "⇧", "Z"] },
    { label: t("shortcut_save"), keys: [modifier, "S"] },
    { label: t("shortcut_fit"), keys: ["F"] },
    { label: t("shortcut_zoom"), keys: ["+", "−"] },
  ];
  return (
    <dl className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-3 text-xs">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd>
            <Keys keys={row.keys} />
          </dd>
        </div>
      ))}
    </dl>
  );
});
