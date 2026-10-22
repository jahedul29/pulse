"use client";

import { useTranslations } from "next-intl";

export function HiddenValue({ plain = false }: { plain?: boolean }) {
  const tc = useTranslations("common");
  if (plain) return <span className="text-muted-foreground italic">{tc("hiddenValue")}</span>;
  return (
    <span className="inline-block max-w-full rounded bg-muted px-1.5 py-px text-xs leading-5 text-foreground/75 italic">
      {tc("hiddenValue")}
    </span>
  );
}
