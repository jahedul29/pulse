"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity } from "lucide-react";
import { SECTIONS } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r bg-sidebar lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Activity className="size-5" />
        </span>
        <div className="leading-tight">
          <div className="font-heading text-base font-semibold">Pulse</div>
          <div className="text-xs text-muted-foreground">Admin &amp; BI</div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {SECTIONS.map((s) => {
          const href = `/${s.slug}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const Icon = s.icon;
          return (
            <Link
              key={s.slug}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{s.label}</span>
              {!s.live && (
                <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t px-5 py-4 text-xs text-muted-foreground">
        Demo build · mock data
      </div>
    </aside>
  );
}
