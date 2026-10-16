"use client";

import { useCallback, useEffect, useRef } from "react";

export function blockedHref(event: MouseEvent, currentUrl: URL): string | null {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return null;
  }
  const target = event.target instanceof Element ? event.target : null;
  const anchor = target?.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return null;
  const destination = new URL(anchor.href, currentUrl);
  if (destination.origin !== currentUrl.origin || destination.pathname.startsWith("//")) return null;
  if (destination.pathname === currentUrl.pathname && destination.search === currentUrl.search) return null;
  return `${destination.pathname}${destination.search}${destination.hash}`;
}

export type BlockedTarget = string | (() => void);

let activeBlocker: ((target: BlockedTarget) => void) | null = null;

export function runGuarded(proceed: () => void) {
  if (activeBlocker) activeBlocker(proceed);
  else proceed();
}

export function useUnsavedChangesGuard(dirty: boolean, onBlocked: (target: BlockedTarget) => void) {
  const bypassRef = useRef(false);
  const onBlockedRef = useRef(onBlocked);

  useEffect(() => {
    onBlockedRef.current = onBlocked;
  }, [onBlocked]);

  useEffect(() => {
    if (!dirty) return;
    bypassRef.current = false;
    const block = (target: BlockedTarget) => {
      if (bypassRef.current) {
        if (typeof target === "function") target();
        return;
      }
      onBlockedRef.current(target);
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (bypassRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const onClick = (event: MouseEvent) => {
      if (bypassRef.current) return;
      const href = blockedHref(event, new URL(window.location.href));
      if (!href) return;
      event.preventDefault();
      onBlockedRef.current(href);
    };
    activeBlocker = block;
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("click", onClick, true);
    return () => {
      if (activeBlocker === block) activeBlocker = null;
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  return useCallback(() => {
    bypassRef.current = true;
  }, []);
}
