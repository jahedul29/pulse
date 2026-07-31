import { Ban, Moon, Video } from "lucide-react";

export function Legend({ supportsOnline }: { supportsOnline: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-4 rounded bg-zinc-100 ring-1 ring-border" />
        {supportsOnline ? "Available (in-person + online)" : "Available"}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="grid size-4 place-items-center rounded bg-danger text-danger-foreground">
          <Ban className="size-2.5" />
        </span>
        Unavailable
      </span>
      {supportsOnline && (
        <span className="flex items-center gap-1.5">
          <span className="grid size-4 place-items-center rounded bg-success text-success-foreground">
            <Video className="size-2.5" />
          </span>
          Online only
        </span>
      )}
      <span className="flex items-center gap-1.5">
        <span className="size-4 rounded bg-orange-100 ring-1 ring-orange-300" />
        Day off
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-4 rounded ring-2 ring-amber-500" />
        Breaks a rule
      </span>
      <span className="flex items-center gap-1.5">
        <Moon className="size-3.5" />
        00:00–06:00 fixed unavailable
      </span>
    </div>
  );
}
