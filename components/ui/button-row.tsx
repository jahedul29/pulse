import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

function ButtonRow({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      data-slot="button-row"
      className={cn(
        "flex flex-col gap-2 sm:grid sm:w-fit sm:grid-flow-col sm:auto-cols-fr",
        className,
      )}
    >
      {children}
    </div>
  );
}

export { ButtonRow };
