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
  return <span className="font-semibold text-violet-700">{children}</span>;
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
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogBody className="py-6 text-center text-sm leading-relaxed text-foreground/90">
          {children}
        </DialogBody>
        <DialogFooter>
          <Button
            className="w-full rounded-full bg-[#2f1a63] hover:bg-[#231149]"
            onClick={() => onOpenChange(false)}
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
