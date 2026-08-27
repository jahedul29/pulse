import { type ComponentProps, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function IconInput({
  leading,
  trailing,
  className,
  dir,
  ...props
}: ComponentProps<typeof Input> & { leading?: ReactNode; trailing?: ReactNode }) {
  return (
    <div dir={dir} className="relative flex items-center">
      {leading && (
        <span className="pointer-events-none absolute start-2.5 top-1/2 flex -translate-y-1/2 text-muted-foreground">
          {leading}
        </span>
      )}
      <Input className={cn(leading && "ps-8", trailing && "pe-8", className)} {...props} />
      {trailing && (
        <span className="pointer-events-none absolute end-2.5 top-1/2 flex -translate-y-1/2 text-muted-foreground">
          {trailing}
        </span>
      )}
    </div>
  );
}

export { IconInput };
