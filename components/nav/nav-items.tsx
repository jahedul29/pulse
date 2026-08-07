"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SECTIONS } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function NavItems({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
      {SECTIONS.filter((s) => s.slug === "personnel").map((s) => {
        const href = `/${s.slug}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const Icon = s.icon;
        return (
          <Link
            key={s.slug}
            href={href}
            onClick={onNavigate}
            title={collapsed ? s.label : undefined}
            aria-label={collapsed ? s.label : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg py-2 text-sm transition-colors",
              collapsed ? "justify-center px-0" : "px-3",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed && <span className="truncate">{s.label}</span>}
            {!collapsed && !s.live && (
              <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                soon
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
