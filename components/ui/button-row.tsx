import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

type ButtonRowLayout = "stack" | "split";

const ROW_LAYOUTS: Record<"sm" | "md", Record<ButtonRowLayout, string>> = {
  sm: {
    stack: "flex flex-col gap-2 sm:grid sm:w-fit sm:grid-flow-col sm:auto-cols-fr",
    split: "grid grid-cols-2 gap-2 sm:w-fit sm:grid-cols-none sm:grid-flow-col sm:auto-cols-fr",
  },
  md: {
    stack: "flex flex-col gap-2 md:grid md:w-fit md:grid-flow-col md:auto-cols-fr",
    split: "grid grid-cols-2 gap-2 md:w-fit md:grid-cols-none md:grid-flow-col md:auto-cols-fr",
  },
};

function ButtonRow({
  className,
  children,
  layout = "stack",
  stackUntil = "sm",
}: {
  className?: string;
  children: ReactNode;
  layout?: ButtonRowLayout;
  stackUntil?: "sm" | "md";
}) {
  return (
    <div data-slot="button-row" className={cn("[&>*]:min-w-24", ROW_LAYOUTS[stackUntil][layout], className)}>
      {children}
    </div>
  );
}

export { ButtonRow };
export type { ButtonRowLayout };
