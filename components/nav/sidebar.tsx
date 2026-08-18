"use client";

import { Activity, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/lib/ui-store";
import { NavItems } from "./nav-items";

export function Sidebar() {
  const t = useTranslations();
  const collapsed = useUiStore((s) => s.collapsed);
  const toggleCollapsed = useUiStore((s) => s.toggleCollapsed);

  return (
    <aside
      data-no-os
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col overflow-y-auto border-e bg-sidebar transition-[width] duration-200 lg:flex",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className={cn("flex items-center gap-2.5 py-5", collapsed ? "justify-center px-0" : "px-5")}>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Activity className="size-5" />
        </span>
        {!collapsed && (
          <div className="leading-tight">
            <div className="font-heading text-base font-semibold">{t("common.appName")}</div>
            <div className="text-xs text-muted-foreground">{t("common.appTagline")}</div>
          </div>
        )}
      </div>

      <NavItems collapsed={collapsed} />

      <div className={cn("border-t py-3", collapsed ? "px-2" : "px-3")}>
        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? t("nav.expandTitle") : t("nav.collapseTitle")}
          className={cn(
            "flex w-full cursor-pointer items-center gap-3 rounded-lg py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground",
            collapsed ? "justify-center px-0" : "px-3",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4 shrink-0 rtl:-scale-x-100" />
          ) : (
            <>
              <PanelLeftClose className="size-4 shrink-0 rtl:-scale-x-100" />
              <span>{t("nav.collapse")}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
