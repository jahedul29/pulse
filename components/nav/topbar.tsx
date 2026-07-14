"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { SECTIONS } from "@/lib/nav";
import { PeriodToggle } from "@/components/common/period-toggle";

function currentSection(pathname: string) {
  const match = SECTIONS.find(
    (s) => pathname === `/${s.slug}` || pathname.startsWith(`/${s.slug}/`),
  );
  return match ?? SECTIONS[2];
}

export function Topbar() {
  const pathname = usePathname();
  const section = currentSection(pathname);
  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b bg-background/85 px-5 py-3 backdrop-blur">
      <div className="mr-auto">
        <div className="font-heading text-lg font-semibold leading-tight">{section.label}</div>
        <div className="text-xs text-muted-foreground">Pulse · Experience Center</div>
      </div>
      <label className="relative hidden items-center md:flex">
        <Search className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
        <input
          type="search"
          placeholder="Universal search"
          className="h-9 w-56 rounded-lg border bg-card pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </label>
      <PeriodToggle />
    </header>
  );
}
