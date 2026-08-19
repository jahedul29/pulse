"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { useIsClient } from "@/lib/use-is-client";
import { Logo } from "@/components/common/logo";

const AUTH_BG =
  "radial-gradient(70% 66% at 16% 22%, color-mix(in oklab, var(--brand-color-1) 100%, black) 0%, transparent 70%)," +
  "radial-gradient(70% 66% at 86% 92%, color-mix(in oklab, var(--brand-color-2) 32%, transparent) 0%, transparent 70%)," +
  "linear-gradient(160deg, color-mix(in oklab, var(--brand-color-1) 84%, black), color-mix(in oklab, var(--brand-color-1) 52%, black))";

const GRID_MASK = "radial-gradient(120% 100% at 50% 50%, #000 30%, transparent 78%)";

export function HeroPanel({ className }: { className?: string }) {
  const t = useTranslations("auth");
  const brand = useTranslations("common");
  const isClient = useIsClient();
  const hour = isClient ? new Date().getHours() : null;
  const greeting =
    hour == null
      ? ""
      : t(hour < 12 ? "greetingMorning" : hour < 18 ? "greetingAfternoon" : "greetingEvening");

  return (
    <div
      className={cn(
        "relative isolate flex-col items-center justify-center gap-8 overflow-hidden p-10 text-center text-white xl:p-12",
        className,
      )}
    >
      <div aria-hidden className="absolute inset-0 -z-10" style={{ background: AUTH_BG }} />
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)",
          backgroundSize: "46px 46px",
          opacity: 0.05,
          maskImage: GRID_MASK,
          WebkitMaskImage: GRID_MASK,
        }}
      />
      <svg aria-hidden className="absolute inset-0 -z-10 h-full w-full opacity-[0.06] mix-blend-overlay">
        <filter id="hero-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#hero-grain)" />
      </svg>

      <div
        className="relative flex flex-col items-center gap-4 animate-in fade-in-0 zoom-in-95 fill-mode-both duration-700 ease-out motion-reduce:animate-none"
        style={{ animationDelay: "120ms" }}
      >
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">
          {brand("appName")} · {brand("appTagline")}
        </span>
        <Logo className="relative h-40 drop-shadow-[0_10px_28px_rgba(0,0,0,0.55)] xl:h-48" />
      </div>

      <div
        className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both duration-500 ease-out motion-reduce:animate-none"
        style={{ animationDelay: "300ms" }}
      >
        <h2 className="font-heading text-4xl font-semibold tracking-tight drop-shadow-sm xl:text-5xl">
          {greeting || " "}
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm text-white/80 text-pretty">{t("welcomeBody")}</p>
      </div>
    </div>
  );
}
