"use client";

import { useEffect, useState, type ComponentType } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const COPIED_MS = 1500;

export function CopyButton({
  value,
  label,
  copiedLabel,
  icon: Icon = Copy,
  showLabel = false,
  disabled = false,
}: {
  value: string | (() => string);
  label: string;
  copiedLabel?: string;
  icon?: ComponentType<{ className?: string }>;
  showLabel?: boolean;
  disabled?: boolean;
}) {
  const tc = useTranslations("common");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(typeof value === "function" ? value() : value);
      setCopied(true);
    } catch {
      toast.error(tc("copyFailed"));
    }
  };

  const doneLabel = copiedLabel ?? tc("copied");
  const text = copied ? doneLabel : label;
  const glyph = copied ? <Check className="text-success" /> : <Icon />;
  const announcement = (
    <span className="sr-only" aria-live="polite">
      {copied ? doneLabel : ""}
    </span>
  );

  if (showLabel) {
    return (
      <>
        <Button variant="outline" size="sm" onClick={copy} disabled={disabled} aria-label={text}>
          {glyph}
          <span aria-hidden className="grid">
            <span className={copied ? "invisible col-start-1 row-start-1" : "col-start-1 row-start-1"}>{label}</span>
            <span className={copied ? "col-start-1 row-start-1" : "invisible col-start-1 row-start-1"}>{doneLabel}</span>
          </span>
        </Button>
        {announcement}
      </>
    );
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={copy}
              disabled={disabled}
              focusableWhenDisabled
              aria-label={label}
            />
          }
        >
          {glyph}
        </TooltipTrigger>
        <TooltipContent>{text}</TooltipContent>
      </Tooltip>
      {announcement}
    </>
  );
}
