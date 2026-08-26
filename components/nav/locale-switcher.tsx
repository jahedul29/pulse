"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LOCALE_NAMES, LOCALES, dirFor, type Locale } from "@/i18n/routing";
import { setUserLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";

export function LocaleSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const select = (next: Locale) => {
    setOpen(false);
    if (next === locale) return;
    document.documentElement.setAttribute("lang", next);
    document.documentElement.setAttribute("dir", dirFor(next));
    startTransition(async () => {
      await setUserLocale(next);
      router.refresh();
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={t("language")}
        disabled={pending}
        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border bg-card px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <Globe className="size-4" />
        <span className="hidden sm:inline">{LOCALE_NAMES[locale]}</span>
        <ChevronDown className="size-3.5 opacity-60" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 gap-1 p-1">
        {LOCALES.map((l) => {
          const active = l === locale;
          return (
            <button
              key={l}
              type="button"
              onClick={() => select(l)}
              className={cn(
                "flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-sm transition-colors",
                active
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-foreground hover:bg-muted",
              )}
            >
              {LOCALE_NAMES[l]}
              {active && <Check className="size-4 text-primary" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
