"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtDuration } from "@/lib/availability/constants";
import { configFor } from "@/lib/availability/rules";
import type { RuleConfig } from "@/lib/availability/types";

const THERAPIST_BLOCK_OPTIONS = [30, 45, 60, 90, 120];
const INPERSON_OPTIONS = [30, 45, 60, 90, 120];
const ONLINE_OPTIONS = [15, 30, 45, 60];
const BREAK_OPTIONS = [15, 30, 45, 60];
const WINDOW_OPTIONS = [60, 120, 180, 240, 300, 360, 420, 480];
const DAYS_OFF_OPTIONS = [0, 1, 2, 3];

export function RulesConfigDialog({
  open,
  onOpenChange,
  config,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: RuleConfig;
  onSave: (config: RuleConfig) => void;
}) {
  const t = useTranslations();
  const [draft, setDraft] = useState<RuleConfig>(config);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setDraft(config);
  }

  const isTherapist = draft.specialist === "therapist";

  const handleSave = () => {
    const next: RuleConfig = { ...draft };
    if (isTherapist) {
      next.minBreakMins = next.travelTimeMins;
      next.minBlockOnlineMins = next.minBlockInPersonMins;
    }
    onSave(next);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-manrope w-[calc(100vw-2rem)] max-w-[var(--modal-w)] sm:w-[var(--modal-w)]">
        <DialogHeader>
          <DialogTitle>{t("rulesConfig.title")}</DialogTitle>
          <DialogDescription>{t("rulesConfig.desc")}</DialogDescription>
        </DialogHeader>

        <DialogBody className="grid gap-4 sm:grid-cols-2">
          {isTherapist ? (
            <MinutesField
              label={t("rulesConfig.minAvailBlock")}
              value={draft.minBlockInPersonMins}
              options={THERAPIST_BLOCK_OPTIONS}
              onChange={(value) => setDraft({ ...draft, minBlockInPersonMins: value })}
            />
          ) : (
            <>
              <MinutesField
                label={t("rulesConfig.minInpersonBlock")}
                value={draft.minBlockInPersonMins}
                options={INPERSON_OPTIONS}
                onChange={(value) => setDraft({ ...draft, minBlockInPersonMins: value })}
              />
              <MinutesField
                label={t("rulesConfig.minOnlineBlock")}
                value={draft.minBlockOnlineMins}
                options={ONLINE_OPTIONS}
                onChange={(value) => setDraft({ ...draft, minBlockOnlineMins: value })}
              />
              <MinutesField
                label={t("rulesConfig.minBreak")}
                value={draft.minBreakMins}
                options={BREAK_OPTIONS}
                onChange={(value) => setDraft({ ...draft, minBreakMins: value })}
              />
            </>
          )}

          <MinutesField
            label={t("rulesConfig.continuousWindow")}
            value={draft.continuousWindowMins}
            options={WINDOW_OPTIONS}
            onChange={(value) => setDraft({ ...draft, continuousWindowMins: value })}
          />

          <div className="flex flex-col gap-1.5">
            <Label>{t("rulesConfig.maxDaysOffWeek")}</Label>
            <Select
              value={String(draft.maxDaysOff)}
              onValueChange={(value) => setDraft({ ...draft, maxDaysOff: Number(value) })}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value) => t("rulesConfig.days", { count: Number(value) })}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DAYS_OFF_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {t("rulesConfig.days", { count: option })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setDraft(configFor(draft.specialist))}
            className="sm:me-auto"
          >
            <RotateCcw className="size-3.5" /> {t("rulesConfig.reset")}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave}>{t("rulesConfig.apply")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MinutesField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Select value={String(value)} onValueChange={(next) => onChange(Number(next))}>
        <SelectTrigger className="w-full">
          <SelectValue>{(current) => (current ? fmtDuration(Number(current)) : "")}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {fmtDuration(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
