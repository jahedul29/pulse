"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Form({
  onSubmit,
  className,
  children,
}: {
  onSubmit: () => void;
  className?: string;
  children: ReactNode;
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey)
      return;
    if (event.nativeEvent.isComposing) return;
    const el = event.target as HTMLElement;
    if (el.tagName !== "INPUT") return;
    const type = (el as HTMLInputElement).type;
    if (type === "button" || type === "submit" || type === "checkbox" || type === "radio") return;
    event.preventDefault();
    onSubmit();
  };

  return (
    <div className={cn("contents", className)} onKeyDown={onKeyDown}>
      {children}
    </div>
  );
}
