import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type PageVariant = "data" | "form";

const PAGE_FRAME = "mx-auto w-full max-w-[120rem]";
const FORM_COLUMN = "w-full max-w-6xl";
const FILL_WINDOW = [
  "md:flex md:flex-col md:h-[calc(100dvh-var(--topbar-height,4rem)-3rem)] md:min-h-[30rem]",
  "md:[&>[data-slot=card]]:min-h-0 md:[&>[data-slot=card]]:flex-1",
  "md:[&>[data-slot=card]>[data-slot=card-content]]:flex md:[&>[data-slot=card]>[data-slot=card-content]]:min-h-0",
  "md:[&>[data-slot=card]>[data-slot=card-content]]:flex-1 md:[&>[data-slot=card]>[data-slot=card-content]]:flex-col",
].join(" ");

export function PageContainer({
  variant = "data",
  fill = false,
  className,
  children,
  ...props
}: ComponentProps<"div"> & { variant?: PageVariant; fill?: boolean }) {
  if (variant === "form") {
    return (
      <div data-page={variant} className={PAGE_FRAME}>
        <div className={cn(FORM_COLUMN, className)} {...props}>
          {children}
        </div>
      </div>
    );
  }
  return (
    <div data-page={variant} data-fill={fill || undefined} className={cn(PAGE_FRAME, fill && FILL_WINDOW, className)} {...props}>
      {children}
    </div>
  );
}
