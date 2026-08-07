"use client";

import { Activity, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/lib/ui-store";
import { NavItems } from "./nav-items";

export function MobileNav() {
  const open = useUiStore((s) => s.mobileOpen);
  const setMobileOpen = useUiStore((s) => s.setMobileOpen);

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
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-y-auto border-r bg-sidebar transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!open}
      >
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Activity className="size-5" />
          </span>
          <div className="leading-tight">
            <div className="font-heading text-base font-semibold">ABAPRO</div>
            <div className="text-xs text-muted-foreground">Admin &amp; BI</div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="ml-auto grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <NavItems onNavigate={() => setMobileOpen(false)} />

        <div className="border-t px-5 py-4 text-xs text-muted-foreground">Demo build · mock data</div>
      </aside>
    </div>
  );
}
