"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

import { Chip } from "@/components/common/chip";
import { accessState } from "@/lib/auth/access";
import { useAccessSnapshot } from "@/lib/auth/access-probes";
import { useIsClient } from "@/lib/use-is-client";
import { cn } from "@/lib/utils";

export function useCanOpen(href: string): boolean {
  const isClient = useIsClient();
  const { session, probes } = useAccessSnapshot();
  return !isClient || !session || accessState(session, href, probes) !== "denied";
}

export function RecordLink({
  href,
  label,
  children,
  className,
}: {
  href: string;
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  const canOpen = useCanOpen(href);
  if (!canOpen) return <span className={cn("block max-w-full min-w-0", className)}>{children}</span>;
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "group -mx-1.5 flex w-fit max-w-full items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      <span className="min-w-0">{children}</span>
      <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary rtl:-scale-x-100" />
    </Link>
  );
}

export function InlineRecordLink({ href, children }: { href: string; children: ReactNode }) {
  const canOpen = useCanOpen(href);
  if (!canOpen) return <span className="font-medium">{children}</span>;
  return (
    <Link
      href={href}
      className="font-medium text-primary underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {children}
    </Link>
  );
}

export function ChipLink({ href, children }: { href: string; children: ReactNode }) {
  const canOpen = useCanOpen(href);
  if (!canOpen) return <Chip className="leading-snug whitespace-normal">{children}</Chip>;
  return (
    <Link
      href={href}
      className="rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Chip className="leading-snug whitespace-normal hover:border-primary hover:text-primary">{children}</Chip>
    </Link>
  );
}
