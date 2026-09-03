"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/lib/ui-store";
import { Logo } from "@/components/common/logo";
import { NavItems } from "./nav-items";

export function MobileNav() {
  const t = useTranslations();
  const open = useUiStore((state) => state.mobileOpen);
  const setMobileOpen = useUiStore((state) => state.setMobileOpen);

  return (
    <div className="lg:hidden">
      <div
        onClick={() => setMobileOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex w-64 flex-col overflow-y-auto border-e bg-sidebar transition-transform duration-200",
          open ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full",
        )}
        aria-hidden={!open}
      >
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary">
            <Logo className="h-7 w-auto" />
          </span>
          <div className="flex h-9 min-w-0 flex-col justify-center">
            <div className="truncate font-heading text-base font-semibold leading-5">{t("common.appName")}</div>
            <div className="truncate text-xs leading-4 text-muted-foreground">{t("common.appTagline")}</div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label={t("nav.closeMenu")}
            className="ms-auto grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <NavItems onNavigate={() => setMobileOpen(false)} />

        <div className="border-t px-5 py-4 text-xs text-muted-foreground">{t("nav.demoNote")}</div>
      </aside>
    </div>
  );
}
