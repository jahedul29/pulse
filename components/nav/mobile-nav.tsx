"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SECTIONS } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1.5 overflow-x-auto border-b px-4 py-2 lg:hidden">
      {SECTIONS.map((s) => {
        const href = `/${s.slug}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={s.slug}
            href={href}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs whitespace-nowrap",
              active
                ? "border-transparent bg-primary text-primary-foreground"
                : "text-muted-foreground",
            )}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
