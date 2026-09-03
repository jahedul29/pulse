"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { PaintStatus, RuleConfig } from "@/lib/availability/types";

const TRAVEL_OPTIONS = [45, 60, 75, 90, 105];

function fmtHM(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

type StatusMeta = { status: PaintStatus; label: string; desc: string };

export function PaintControls({
  config,
  expanded,
  onTravelChange,
  onToggleExpanded,
}: {
  config: RuleConfig;
  expanded: boolean;
  onTravelChange: (mins: number) => void;
  onToggleExpanded: () => void;
}) {
  const t = useTranslations("availability");
  const care = config.specialist === "therapist" ? t("care.therapy") : t("care.supervision");
  const statuses: StatusMeta[] = [
    {
      status: "available",
      label: t("controls.availableInpersonLabel"),
      desc: t("controls.availableInpersonDesc", { care }),
    },
    {
      status: "unavailable",
      label: t("controls.unavailableLabel"),
      desc: t("controls.unavailableDesc", { care }),
    },
  ];
  if (config.supportsOnline) {
    statuses.push({
      status: "online",
      label: t("controls.onlineLabel"),
      desc: t("controls.onlineDesc"),
    });
  }

  return (
    <div className="flex flex-col items-center gap-3 font-semibold">
      {config.specialist === "therapist" && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-center text-xs text-muted-foreground md:text-sm">
            {t("controls.travelPrompt")}
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            {TRAVEL_OPTIONS.map((mins) => {
              const active = config.travelTimeMins === mins;
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => onTravelChange(mins)}
                  className={cn(
                    "tabular flex h-[30px] w-16 cursor-pointer items-center justify-center rounded-[10px] border px-3 text-xs font-semibold transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border-strong bg-muted text-muted-foreground hover:bg-muted/70",
                  )}
                >
                  {fmtHM(mins)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <span className="text-center text-xs text-muted-foreground md:text-sm">
        {t("controls.paintInstr")}
      </span>

      <div
        className={cn(
          "grid w-full max-w-2xl gap-2 sm:gap-3",
          statuses.length === 3 ? "grid-cols-3" : "grid-cols-2",
        )}
      >
        {statuses.map((statusMeta) => (
          <LegendItem key={statusMeta.status} meta={statusMeta} showDesc={expanded} />
        ))}
      </div>

      <button
        type="button"
        onClick={onToggleExpanded}
        aria-label={expanded ? "Collapse" : "Expand"}
        className="-mt-1 flex h-7 w-12 cursor-pointer items-center justify-center rounded-full bg-card shadow-md ring-1 ring-foreground/10 transition-colors hover:bg-muted"
      >
        <ChevronDown
          className={cn(
            "size-5 stroke-[2.5] text-primary transition-transform duration-300 ease-out motion-reduce:transition-none",
            expanded && "rotate-180",
          )}
        />
      </button>
    </div>
  );
}

function LegendItem({ meta, showDesc }: { meta: StatusMeta; showDesc: boolean }) {
  const unavailable = meta.status === "unavailable";
  const online = meta.status === "online";
  return (
    <div className="flex w-full flex-col items-center text-center">
      <div
        className={cn(
          "flex h-10 w-full items-center justify-center gap-1 rounded-[10px] px-2 text-center text-xs leading-tight font-semibold sm:gap-1.5 sm:px-4 md:text-sm",
          unavailable
            ? "bg-danger text-danger-foreground"
            : "bg-muted text-muted-foreground ring-1 ring-inset ring-border-strong",
        )}
      >
        {online && <span className="size-2.5 shrink-0 rounded-full bg-chart-3 sm:size-3.5" />}
        {meta.label}
      </div>
      <div
        className={cn(
          "grid w-full overflow-hidden transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
          showDesc ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <p
          className={cn(
            "min-h-0 overflow-hidden pt-1.5 text-[10px] leading-snug md:text-xs text-muted-foreground transition-opacity duration-300 motion-reduce:transition-none",
            showDesc ? "opacity-100" : "opacity-0",
          )}
        >
          {meta.desc}
        </p>
      </div>
    </div>
  );
}
