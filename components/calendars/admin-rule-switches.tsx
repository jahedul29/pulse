"use client";

import { useRef, useState } from "react";
import { create } from "zustand";
import Link from "next/link";
import { Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { useParameterValueLabel } from "@/lib/calendars/labels";
import { SwitchField } from "@/components/common/switch-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useHasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import {
  ANNUAL_NUMERIC_KEYS,
  ROLE_SUPPORTS_ONLINE,
  WEEKLY_NUMERIC_KEYS,
  useCalendarParameters,
  type CalendarKind,
  type NumericKey,
  type ParameterPath,
  type RoleParameters,
} from "@/lib/calendars/parameters";
import type { Specialist } from "@/lib/specialists";
import { useDraggableOffset, type DragOffset } from "@/lib/use-draggable-offset";
import { cn } from "@/lib/utils";

type SwitchRow = { key: string; path: ParameterPath; description: string; configurable: boolean };

const SPIN: Keyframe[] = [{ transform: "rotate(0deg)" }, { transform: "rotate(180deg)" }];

const useGearPosition = create<{ offset: DragOffset; setOffset: (offset: DragOffset) => void }>((set) => ({
  offset: { x: 0, y: 0 },
  setOffset: (offset) => set({ offset }),
}));

export function AdminRuleSwitches({ specialist, kind, parameters }: { specialist: Specialist; kind: CalendarKind; parameters: RoleParameters }) {
  const t = useTranslations("calendarSettings");
  const valueLabel = useParameterValueLabel();
  const [open, setOpen] = useState(false);
  const spinner = useRef<HTMLSpanElement>(null);
  const gear = useRef<HTMLButtonElement>(null);
  const offset = useGearPosition((state) => state.offset);
  const setOffset = useGearPosition((state) => state.setOffset);
  const { dragging, handlers } = useDraggableOffset(gear, offset, setOffset);
  const flags = useCalendarParameters((state) => state.adminSwitches[specialist.id]);
  const custom = useCalendarParameters((state) => state.specialistOverrides[specialist.id]);
  const setEnabled = useCalendarParameters((state) => state.setRuleEnabled);
  const setAllEnabled = useCalendarParameters((state) => state.setRulesEnabled);
  const canEdit = useHasPermission(PERMISSIONS.TECHNICAL_EDIT);
  if (!canEdit) return null;

  const caption = (key: string, value: string) =>
    t("switchCaption", { value, source: t(Object.hasOwn(custom?.[kind] ?? {}, key) ? "customized" : "inherited") });
  const numericRow = (path: ParameterPath, key: NumericKey, value: number, configurable: boolean): SwitchRow => ({
    key,
    path,
    description: configurable ? caption(key, valueLabel(key, value)) : t("configuredOff"),
    configurable,
  });
  const rows: SwitchRow[] =
    kind === "annual"
      ? ANNUAL_NUMERIC_KEYS.map((key) => numericRow(`annual.${key}`, key, parameters.annual[key], parameters.annual[key] > 0))
      : WEEKLY_NUMERIC_KEYS.filter((key) => key !== "minBlockOnlineMins" || ROLE_SUPPORTS_ONLINE[specialist.role]).map((key) =>
          numericRow(`weekly.${key}`, key, parameters.weekly[key], parameters.weekly[key] > 0 || key === "maxDaysOff"),
        );
  const configurablePaths = rows.filter((row) => row.configurable).map((row) => row.path);
  const bypassed = rows.filter((row) => row.configurable && flags?.[row.path] === false);
  const allBypassed = configurablePaths.length > 0 && bypassed.length === configurablePaths.length;

  const openDrawer = () => {
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) spinner.current?.animate?.(SPIN, { duration: 450, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    setOpen(true);
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              ref={gear}
              type="button"
              data-admin-rule-switches
              data-dragging={dragging || undefined}
              style={{ translate: `${offset.x}px ${offset.y}px` }}
              {...handlers}
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-label={bypassed.length ? t("openSwitchesCount", { count: bypassed.length }) : t("adminSwitches")}
              onClick={openDrawer}
              className="group/gear fixed end-6 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-40 grid size-12 touch-none place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-primary-foreground/10 transition-[background-color,box-shadow,transform] duration-200 outline-none select-none hover:bg-primary/90 hover:shadow-xl focus-visible:ring-4 focus-visible:ring-ring/40 active:scale-95 data-[dragging]:cursor-grabbing data-[dragging]:shadow-2xl motion-reduce:transition-none"
            />
          }
        >
          <span ref={spinner} className="grid place-items-center">
            <Settings
              aria-hidden
              className="size-5 transition-transform duration-500 ease-out motion-safe:group-hover/gear:rotate-90 motion-safe:group-focus-visible/gear:rotate-90"
            />
          </span>
          {bypassed.length > 0 && (
            <span
              aria-hidden
              className="tabular absolute -end-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-warning px-1 text-xs font-semibold text-warning-foreground ring-2 ring-background"
            >
              {bypassed.length}
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent side="inline-start">{t("adminSwitches")}</TooltipContent>
      </Tooltip>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader className="pe-12">
            <SheetTitle>{t("adminSwitches")}</SheetTitle>
            <SheetDescription className="text-pretty">{t("adminSwitchesHint")}</SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-4">
            <SwitchField
              label={t("overrideAll")}
              description={t("overrideAllHint")}
              checked={allBypassed}
              disabled={configurablePaths.length === 0}
              onCheckedChange={(checked) => setAllEnabled(specialist.id, configurablePaths, !checked)}
            />
            <div className="flex flex-col gap-2 border-t pt-4">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t(kind)}</h3>
              {rows.map(({ key, path, description, configurable }) => {
                const rule = t(`fields.${key}`);
                return (
                  <SwitchField
                    key={path}
                    label={rule}
                    description={description}
                    ariaLabel={t("enforceNamed", { rule })}
                    checked={configurable && flags?.[path] !== false}
                    disabled={!configurable}
                    onCheckedChange={(checked) => setEnabled(specialist.id, path, checked)}
                  />
                );
              })}
            </div>
          </SheetBody>
          <SheetFooter layout="split">
            <Button
              variant="outline"
              size="lg"
              disabled={bypassed.length === 0}
              onClick={() => setAllEnabled(specialist.id, configurablePaths, true)}
            >
              {t("turnAllOn")}
            </Button>
            <Link
              href={`/calendar-settings?specialist=${encodeURIComponent(specialist.id)}`}
              className={cn(buttonVariants({ size: "lg" }))}
            >
              {t("manageValues")}
            </Link>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
