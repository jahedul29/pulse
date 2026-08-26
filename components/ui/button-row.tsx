import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

type ButtonRowLayout = "stack" | "split";

function ButtonRow({
  className,
  children,
  layout = "stack",
}: {
  className?: string;
  children: ReactNode;
  layout?: ButtonRowLayout;
}) {
  return (
    <div
      data-slot="button-row"
      className={cn(
        "[&>*]:min-w-24",
        layout === "split"
          ? "grid grid-cols-2 gap-2 sm:w-fit sm:grid-cols-none sm:grid-flow-col sm:auto-cols-fr"
          : "flex flex-col gap-2 sm:grid sm:w-fit sm:grid-flow-col sm:auto-cols-fr",
        className,
      )}
    >
      {children}
    </div>
  );
}

export { ButtonRow };
export type { ButtonRowLayout };
