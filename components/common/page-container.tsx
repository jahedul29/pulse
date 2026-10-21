import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type PageVariant = "data" | "form";

const PAGE_FRAME = "mx-auto w-full max-w-[120rem]";
const FORM_COLUMN = "w-full max-w-6xl";

export function PageContainer({
  variant = "data",
  className,
  children,
  ...props
}: ComponentProps<"div"> & { variant?: PageVariant }) {
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
    <div data-page={variant} className={cn(PAGE_FRAME, className)} {...props}>
      {children}
    </div>
  );
}
