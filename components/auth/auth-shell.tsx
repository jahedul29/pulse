"use client";

import { type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { HeroPanel } from "./hero-panel";

const RIGHT_TINT =
  "radial-gradient(80% 60% at 92% 4%, color-mix(in oklab, var(--brand-color-1) 16%, transparent) 0%, transparent 58%)," +
  "radial-gradient(70% 60% at 4% 104%, color-mix(in oklab, var(--brand-color-2) 12%, transparent) 0%, transparent 60%)," +
  "radial-gradient(90% 90% at 50% 50%, color-mix(in oklab, var(--brand-color-1) 4%, transparent) 0%, transparent 70%)";

export function AuthShell({
  title,
  subtitle,
  animationKey,
  align = "start",
  children,
  footer,
}: {
  title?: string;
  subtitle?: string;
  animationKey?: string;
  align?: "start" | "center";
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-svh w-full lg:grid-cols-2">
      <HeroPanel className="hidden lg:flex" />

      <div className="relative flex min-h-svh flex-col justify-center overflow-hidden bg-background px-6 py-10 sm:px-10">
        <div aria-hidden className="absolute inset-0" style={{ background: RIGHT_TINT }} />

        <div className="relative mx-auto w-full max-w-[26rem]">
          <div
            key={animationKey}
            className="rounded-2xl border border-border bg-card/90 p-6 shadow-xl ring-1 ring-black/5 backdrop-blur-xl supports-[backdrop-filter]:bg-card/75 animate-in fade-in-0 slide-in-from-bottom-2 duration-500 ease-out motion-reduce:animate-none"
          >
            {title ? (
              <div className={cn("mb-6 flex flex-col gap-1", align === "center" && "text-center")}>
                <h1 className="font-heading text-xl font-semibold tracking-tight">{title}</h1>
                {subtitle ? (
                  <p className="text-sm text-muted-foreground text-pretty">{subtitle}</p>
                ) : null}
              </div>
            ) : null}

            {children}

            {footer ? (
              <div className="mt-6 border-t border-border pt-4">{footer}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
