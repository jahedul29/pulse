"use client";

import { useRef, type ComponentProps, type PointerEvent as ReactPointerEvent } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ButtonRow, type ButtonRowLayout } from "@/components/ui/button-row";

function Sheet({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/20 duration-200 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

type SheetContentProps = DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
  onSwipeNext?: () => void;
  onSwipePrev?: () => void;
};

function SheetContent({
  className,
  children,
  showCloseButton = true,
  onSwipeNext,
  onSwipePrev,
  ...props
}: SheetContentProps) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType !== "touch") return;
    start.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s || e.pointerType !== "touch") return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
    const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
    const goNext = rtl ? dx > 0 : dx < 0;
    (goNext ? onSwipeNext : onSwipePrev)?.();
  };
  return (
    <DialogPrimitive.Portal data-slot="sheet-portal">
      <SheetOverlay />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        className={cn(
          "fixed z-50 flex flex-col overflow-hidden bg-popover text-sm text-popover-foreground ring-1 ring-foreground/10 duration-200 outline-none",
          "start-0 end-0 bottom-0 h-[88dvh] w-full rounded-t-2xl border-t",
          "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none",
          "max-sm:data-open:slide-in-from-bottom max-sm:data-closed:slide-out-to-bottom",
          "sm:inset-y-0 sm:start-auto sm:end-0 sm:bottom-auto sm:h-dvh sm:max-h-none sm:w-[min(34rem,92vw)] sm:rounded-none sm:border-t-0 sm:border-s",
          "sm:data-open:slide-in-from-right sm:data-closed:slide-out-to-right",
          "sm:rtl:data-open:slide-in-from-left sm:rtl:data-closed:slide-out-to-left",
          className,
        )}
        {...props}
      >
        <div
          aria-hidden
          className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-foreground/15 sm:hidden"
        />
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="sheet-close"
            render={<Button variant="ghost" size="icon-sm" className="absolute top-3 end-3" />}
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex shrink-0 flex-col gap-1.5 border-b px-4 pt-4 pb-3", className)}
      {...props}
    />
  );
}

function SheetBody({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-body"
      className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4", className)}
      {...props}
    />
  );
}

function SheetFooter({
  className,
  children,
  layout,
  ...props
}: ComponentProps<"div"> & { layout?: ButtonRowLayout }) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "shrink-0 border-t bg-muted/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
        className,
      )}
      {...props}
    >
      <ButtonRow layout={layout} className="sm:ms-auto">
        {children}
      </ButtonRow>
    </div>
  );
}

function SheetTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn("font-heading text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetOverlay,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
