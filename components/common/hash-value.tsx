"use client";

import { useTranslations } from "next-intl";

import { CopyButton } from "@/components/common/copy-button";
import { ReferenceCode } from "@/components/common/reference-code";

const SHORT_HEAD = 12;
const SHORT_TAIL = 8;

export function shortHash(value: string): string {
  return value.length > SHORT_HEAD + SHORT_TAIL + 4 ? `${value.slice(0, SHORT_HEAD)}…${value.slice(-SHORT_TAIL)}` : value;
}

export function HashValue({ value, short = false, label }: { value: string; short?: boolean; label?: string }) {
  const tc = useTranslations("common");
  return (
    <span className="flex min-w-0 items-start gap-1">
      <ReferenceCode
        value={short ? shortHash(value) : value}
        title={short ? value : undefined}
        className="min-w-0 flex-1 py-1.5 leading-relaxed"
      />
      <CopyButton value={value} label={label ? tc("copyNamed", { name: label }) : tc("copy")} />
    </span>
  );
}
