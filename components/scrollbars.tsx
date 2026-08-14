"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { OverlayScrollbars } from "overlayscrollbars";
import type { PartialOptions } from "overlayscrollbars";

export const OS_OPTIONS: PartialOptions = {
  scrollbars: {
    theme: "os-theme-app",
    autoHide: "scroll",
    autoHideDelay: 600,
    clickScroll: true,
  },
};

const SCROLL_SELECTOR = [
  "[data-overlayscrollbars-initialize]",
  '[class*="overflow-auto"]',
  '[class*="overflow-scroll"]',
  '[class*="overflow-y-auto"]',
  '[class*="overflow-y-scroll"]',
  '[class*="overflow-x-auto"]',
  '[class*="overflow-x-scroll"]',
].join(",");

const DENY_SELECTOR = ".leaflet-container,.recharts-wrapper,[data-no-os]";

function initEl(el: HTMLElement) {
  if (el.closest(DENY_SELECTOR)) return;
  const display = getComputedStyle(el).display;
  if (display === "flex" || display === "grid" || display === "inline-flex" || display === "inline-grid") {
    return;
  }
  if (OverlayScrollbars(el)) return;
  OverlayScrollbars(el, OS_OPTIONS);
}

function scan(root: ParentNode) {
  root.querySelectorAll<HTMLElement>(SCROLL_SELECTOR).forEach(initEl);
}

export function AppScroll({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) initEl(ref.current);
    scan(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches(SCROLL_SELECTOR)) initEl(node);
          scan(node);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-overlayscrollbars-initialize=""
      className="h-dvh w-full overflow-y-auto"
    >
      {children}
    </div>
  );
}
