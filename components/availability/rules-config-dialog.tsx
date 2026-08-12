"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
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
      <DialogContent className="sm:max-w-md font-manrope theme-violet">
        <DialogHeader>
          <DialogTitle>Update calendar rules</DialogTitle>
          <DialogDescription>
            These parameters come from the Services module. Editing them re-checks the calendar
            instantly.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="grid gap-4 sm:grid-cols-2">
          {isTherapist ? (
            <MinutesField
              label="Min availability block"
              value={draft.minBlockInPersonMins}
              options={THERAPIST_BLOCK_OPTIONS}
              onChange={(v) => setDraft({ ...draft, minBlockInPersonMins: v })}
            />
          ) : (
            <>
              <MinutesField
                label="Min in-person block"
                value={draft.minBlockInPersonMins}
                options={INPERSON_OPTIONS}
                onChange={(v) => setDraft({ ...draft, minBlockInPersonMins: v })}
              />
              <MinutesField
                label="Min online block"
                value={draft.minBlockOnlineMins}
                options={ONLINE_OPTIONS}
                onChange={(v) => setDraft({ ...draft, minBlockOnlineMins: v })}
              />
              <MinutesField
                label="Min break between blocks"
                value={draft.minBreakMins}
                options={BREAK_OPTIONS}
                onChange={(v) => setDraft({ ...draft, minBreakMins: v })}
              />
            </>
          )}

          <MinutesField
            label="Continuous window"
            value={draft.continuousWindowMins}
            options={WINDOW_OPTIONS}
            onChange={(v) => setDraft({ ...draft, continuousWindowMins: v })}
          />

          <div className="flex flex-col gap-1.5">
            <Label>Max days off / week</Label>
            <Select
              value={String(draft.maxDaysOff)}
              onValueChange={(v) => setDraft({ ...draft, maxDaysOff: Number(v) })}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue>{(v) => `${v} ${Number(v) === 1 ? "day" : "days"}`}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DAYS_OFF_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} {n === 1 ? "day" : "days"}
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
            className="sm:mr-auto"
          >
            <RotateCcw className="size-3.5" /> Reset to defaults
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Apply rules</Button>
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
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger className="h-9 w-full">
          <SelectValue>{(v) => (v ? fmtDuration(Number(v)) : "")}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {fmtDuration(n)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
