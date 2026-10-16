"use client";

import type { ReactNode } from "react";
import { useRetained } from "@/lib/use-retained";
import { cn } from "@/lib/utils";
import { MapNotice } from "./map-notice";

export interface NoticeContent {
  text: string;
  tone?: "info" | "warning";
  action?: ReactNode;
}

export function NoticeSlot({ notice }: { notice: NoticeContent | null }) {
  const shown = useRetained(notice);
  const open = notice !== null;
  return (
    <div
      aria-hidden={open ? undefined : true}
      inert={open ? undefined : true}
      className={cn(
        "grid max-w-full transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="min-h-0 overflow-hidden px-1 pt-1 pb-1">
        {shown ? (
          <MapNotice tone={shown.tone} action={shown.action}>
            {shown.text}
          </MapNotice>
        ) : null}
      </div>
    </div>
  );
}
