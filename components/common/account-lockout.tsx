"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, CalendarClock, Loader2, LockKeyhole } from "lucide-react";

import { cn } from "@/lib/utils";
import { fmtDateTimeParts } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function useRemaining(target: number) {
  const [remaining, setRemaining] = useState(() => Math.max(0, target - Date.now()));
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, target - Date.now()));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [target]);
  return remaining;
}

const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function AccountLockout({
  lockedUntil,
  canUnlock = false,
  unlocking = false,
  onUnlock,
  onExpire,
  onBack,
  className,
}: {
  lockedUntil: number;
  canUnlock?: boolean;
  unlocking?: boolean;
  onUnlock?: () => void;
  onExpire?: () => void;
  onBack?: () => void;
  className?: string;
}) {
  const t = useTranslations("auth");
  const common = useTranslations("common");
  const locale = useLocale();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const remaining = useRemaining(lockedUntil);
  const expired = remaining <= 0;
  const [initial] = useState(() => Math.max(1, lockedUntil - Date.now()));

  const fired = useRef(false);
  useEffect(() => {
    if (expired && !fired.current) {
      fired.current = true;
      onExpire?.();
    }
  }, [expired, onExpire]);

  if (expired) return null;

  const total = Math.floor(remaining / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  const progress = Math.min(1, Math.max(0, remaining / initial));

  const { time: timePart, date: datePart } = fmtDateTimeParts(lockedUntil, locale);

  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center gap-5 py-2 text-center animate-in fade-in-0 zoom-in-95 duration-300",
        className,
      )}
    >
      <div
        className="relative grid size-[104px] place-items-center"
        role="timer"
        aria-label={t("unlocksIn", { time: `${mm}m ${ss}s` })}
      >
        <svg viewBox="0 0 104 104" className="absolute inset-0 size-full -rotate-90">
          <defs>
            <linearGradient id="lockArc" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="104" y2="104">
              <stop offset="0%" stopColor="color-mix(in oklab, var(--danger) 60%, white)" />
              <stop offset="100%" stopColor="var(--danger)" />
            </linearGradient>
          </defs>
          <circle cx="52" cy="52" r={RADIUS} fill="none" strokeWidth="6" className="stroke-muted" />
          <circle
            cx="52"
            cy="52"
            r={RADIUS}
            fill="none"
            stroke="url(#lockArc)"
            strokeWidth="6"
            strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-1000 ease-linear motion-reduce:transition-none"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          />
        </svg>
        <div className="flex flex-col items-center gap-0.5 leading-none">
          <LockKeyhole className="size-3.5 text-danger/80" />
          <span
            suppressHydrationWarning
            className="tabular font-mono text-2xl font-semibold tracking-tight tabular-nums"
          >
            {mm}:{ss}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <h2 className="font-heading text-base font-semibold">{t("lockedTitle")}</h2>
        <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5">
          <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-sm">
            <span className="text-muted-foreground">{t("unlocksAtLabel")} </span>
            <span suppressHydrationWarning className="font-semibold text-foreground">
              {timePart}
            </span>
            <span className="text-muted-foreground"> · </span>
            <span suppressHydrationWarning className="font-medium text-foreground">
              {datePart}
            </span>
          </span>
        </div>
      </div>

      {canUnlock ? (
        <>
          <Button
            variant="destructive"
            size="sm"
            disabled={unlocking}
            aria-busy={unlocking}
            onClick={() => setConfirmOpen(true)}
          >
            {unlocking ? <Loader2 className="animate-spin" /> : <LockKeyhole />}
            {t("unlockNow")}
          </Button>

          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("unlockConfirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>{t("unlockConfirmBody")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{common("cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => {
                    setConfirmOpen(false);
                    onUnlock?.();
                  }}
                >
                  {t("unlockNow")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}

      {onBack ? (
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="rtl:-scale-x-100" />
          {t("backToSignIn")}
        </Button>
      ) : null}
    </div>
  );
}
