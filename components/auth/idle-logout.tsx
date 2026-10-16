"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  ACTIVITY_WRITE_MS,
  announceIdleSignOut,
  formatCountdown,
  IDLE_CHECK_MS,
  IDLE_SIGN_OUT_KEY,
  IDLE_WARNING_SECONDS,
  idleLoginHref,
  idlePhase,
  LAST_ACTIVITY_KEY,
  POINTER_ACTIVITY_MS,
  readLastActivity,
  secondsUntilSignOut,
  writeLastActivity,
  type IdlePhase,
} from "@/lib/auth/idle";
import { useAuthStore } from "@/lib/auth/store";

const INPUT_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

function IdleWatcher() {
  const t = useTranslations("auth");
  const router = useRouter();
  const signOut = useAuthStore((state) => state.signOut);
  const [phase, setPhase] = useState<IdlePhase>("active");
  const phaseRef = useRef<IdlePhase>("active");
  const [secondsLeft, setSecondsLeft] = useState(IDLE_WARNING_SECONDS);
  const lastActivityRef = useRef(0);
  const lastWriteRef = useRef(0);
  const lastPointerRef = useRef(0);
  const finishedRef = useRef(false);

  const leave = useCallback(
    (href: string) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      signOut();
      router.replace(href);
    },
    [router, signOut],
  );

  const showPhase = useCallback((next: IdlePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const recordActivity = useCallback(
    (now: number, force = false) => {
      lastActivityRef.current = now;
      if (force || now - lastWriteRef.current >= ACTIVITY_WRITE_MS) {
        lastWriteRef.current = now;
        writeLastActivity(now);
      }
      showPhase("active");
    },
    [showPhase],
  );

  useEffect(() => {
    const started = Date.now();
    const stored = readLastActivity();
    lastActivityRef.current = stored ?? started;
    if (stored === null) writeLastActivity(started);

    const evaluate = () => {
      const shared = readLastActivity();
      if (shared !== null && shared > lastActivityRef.current) lastActivityRef.current = shared;
      const now = Date.now();
      const next = idlePhase(lastActivityRef.current, now);
      if (next === "expired") {
        announceIdleSignOut(now);
        leave(idleLoginHref(`${window.location.pathname}${window.location.search}`));
        return;
      }
      showPhase(next);
      setSecondsLeft(secondsUntilSignOut(lastActivityRef.current, now));
    };

    const onInput = () => {
      if (phaseRef.current === "active") recordActivity(Date.now());
    };
    const onPointerMove = () => {
      if (phaseRef.current !== "active") return;
      const now = Date.now();
      if (now - lastPointerRef.current < POINTER_ACTIVITY_MS) return;
      lastPointerRef.current = now;
      recordActivity(now);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === IDLE_SIGN_OUT_KEY && event.newValue) {
        leave(idleLoginHref(`${window.location.pathname}${window.location.search}`));
        return;
      }
      if (event.key === LAST_ACTIVITY_KEY) evaluate();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") evaluate();
    };

    const firstCheck = setTimeout(evaluate, 0);
    const interval = setInterval(evaluate, IDLE_CHECK_MS);
    for (const type of INPUT_EVENTS) document.addEventListener(type, onInput, { capture: true, passive: true });
    document.addEventListener("pointermove", onPointerMove, { capture: true, passive: true });
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("storage", onStorage);
    return () => {
      clearTimeout(firstCheck);
      clearInterval(interval);
      for (const type of INPUT_EVENTS) document.removeEventListener(type, onInput, { capture: true });
      document.removeEventListener("pointermove", onPointerMove, { capture: true });
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", onStorage);
    };
  }, [leave, recordActivity, showPhase]);

  const signOutNow = () => {
    toast.success(t("signedOut"));
    leave("/login");
  };

  return (
    <AlertDialog
      open={phase === "warning"}
      onOpenChange={(open) => {
        if (!open) recordActivity(Date.now(), true);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("idleTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("idleBody")}</AlertDialogDescription>
        </AlertDialogHeader>
        <p className="tabular text-center font-heading text-3xl leading-10 font-semibold" aria-hidden>
          {formatCountdown(secondsLeft)}
        </p>
        <AlertDialogFooter layout="split">
          <Button variant="outline" size="lg" onClick={signOutNow}>
            {t("idleSignOutNow")}
          </Button>
          <AlertDialogAction onClick={() => recordActivity(Date.now(), true)}>{t("idleStay")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function IdleLogout() {
  const signedIn = useAuthStore((state) => state.session !== null);
  return signedIn ? <IdleWatcher /> : null;
}
