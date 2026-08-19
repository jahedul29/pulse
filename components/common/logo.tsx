import Image from "next/image";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/abapro-logo.svg"
      alt="ABAPRO"
      width={100}
      height={100}
      priority
      className={cn("h-8 w-auto", className)}
    />
  );
}
