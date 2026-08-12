"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function NoticeHl({ children }: { children: ReactNode }) {
  return <span className="font-semibold text-primary">{children}</span>;
}

export function NoticeDialog({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm font-manrope theme-violet">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogBody className="py-6 text-center text-sm font-semibold leading-relaxed text-foreground/90">
          {children}
        </DialogBody>
        <DialogFooter>
          <Button
            className="w-full rounded-full bg-primary hover:bg-primary/90"
            onClick={() => onOpenChange(false)}
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
