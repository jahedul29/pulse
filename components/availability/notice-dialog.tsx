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
      <DialogContent showCloseButton={false} className="font-manrope theme-violet sm:w-[390px] sm:max-w-[390px]">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogBody className="py-6 text-center text-sm font-semibold leading-relaxed text-foreground/90">
          {children}
        </DialogBody>
        <DialogFooter>
          <Button
            size="lg"
            className="mx-auto h-9 w-[200px] rounded-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90 sm:h-10 sm:w-[250px]"
            onClick={() => onOpenChange(false)}
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
