"use client";

import type { ReactNode } from "react";
import { CalendarCheck, Clock, Settings2, X } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fmtDuration } from "@/lib/availability/constants";
import type { RuleConfig, SpecialistType } from "@/lib/availability/types";

function Hl({ children }: { children: ReactNode }) {
  return <span className="font-semibold text-violet-700">{children}</span>;
}

function windowLabel(mins: number): string {
  return mins % 60 === 0 ? `${mins / 60}-hour` : fmtDuration(mins);
}

const ROLE_TITLE: Record<SpecialistType, string> = {
  therapist: "Setting up Therapist weekly business hours",
  analyst: "Setting up Analyst weekly business hours",
};

export function GuidelinesDialog({
  open,
  onOpenChange,
  role,
  config,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: SpecialistType;
  config: RuleConfig;
}) {
  const therapist = role === "therapist";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <div className="relative shrink-0 border-b px-12 pt-4 pb-3">
          <DialogTitle className="text-center text-lg leading-snug font-bold text-balance text-foreground">
            {ROLE_TITLE[role]}
          </DialogTitle>
          <DialogClose
            aria-label="Close"
            className="absolute top-3 right-3 grid size-7 cursor-pointer place-items-center rounded-full bg-[#2f1a63] text-white transition-colors hover:bg-[#231149] focus-visible:ring-2 focus-visible:ring-[#2f1a63]/40 focus-visible:outline-none"
          >
            <X className="size-4" />
          </DialogClose>
        </div>

        <DialogBody className="flex flex-col gap-4 text-center text-sm text-foreground/80">
          <p>
            We strive to make you and your Clients happy. That&apos;s why setting up your
            availability correctly throughout the day is crucial.
          </p>

          {therapist ? (
            <p>
              Pick how long you need to get between clients (min. <Hl>00h45m</Hl>&nbsp;for your
              location). Do this first! Changing it later resets your calendar settings.
            </p>
          ) : (
            <p>
              As an analyst, select whether you&apos;ll supervise <Hl>in-person</Hl>&nbsp;at the
              client&apos;s location, <Hl>online</Hl>&nbsp;from anywhere, or a mix of both. You can
              combine both types throughout your day.
            </p>
          )}

          <p>
            {therapist ? "Need a break? Grab up to " : "First, if you need a weekly break, select up to "}
            <Hl>
              {config.maxDaysOff} {config.maxDaysOff === 1 ? "DAY OFF" : "DAYS OFF"}
            </Hl>
            &nbsp;a week. You can set custom work hours for these days if you like. For all other
            days, your {therapist ? "" : "personalized "}workday rules will apply.
          </p>

          <GuidelineCard icon={<Clock className="size-6" />}>
            For <Hl>WORKDAYS</Hl>&nbsp;your schedule will be the same. Ensure your workdays have at
            least one <Hl>continuous {windowLabel(config.continuousWindowMins)} window</Hl>
            {therapist
              ? " when you're available for bookings."
              : " available for supervision (in-person or online)."}
          </GuidelineCard>

          <GuidelineCard icon={<Settings2 className="size-6" />}>
            {therapist ? (
              <>
                Any availability slots must be at least{" "}
                <Hl>{fmtDuration(config.minBlockInPersonMins)}</Hl>&nbsp;long. Any breaks between your
                availability slots can&apos;t be shorter than your chosen <Hl>travel time</Hl>.
              </>
            ) : (
              <>
                Any availability slots must be at least{" "}
                <Hl>{fmtDuration(config.minBlockInPersonMins)}</Hl>&nbsp;for in-person and{" "}
                <Hl>{fmtDuration(config.minBlockOnlineMins)}</Hl>&nbsp;for online supervision. Any
                breaks between availability slots can be{" "}
                <Hl>{fmtDuration(config.minBreakMins)}</Hl>&nbsp;or longer.
              </>
            )}
          </GuidelineCard>

          <GuidelineCard icon={<CalendarCheck className="size-6" />}>
            {therapist ? (
              <>
                To keep your rating high and prevent double-booking, we automatically add travel time
                to every session. You&apos;ll only ever be booked for <Hl>one client at a time</Hl>.
              </>
            ) : (
              <>
                We prevent double-booking, but sessions can be <Hl>back-to-back</Hl>. Please plan
                your schedule to ensure you arrive on time at the client&apos;s location for
                in-person sessions.
              </>
            )}
          </GuidelineCard>
        </DialogBody>

        <DialogFooter>
          <Button
            className="w-full rounded-full bg-[#2f1a63] hover:bg-[#231149]"
            onClick={() => onOpenChange(false)}
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GuidelineCard({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border p-3 text-left">
      <span className="mt-0.5 shrink-0 text-violet-700">{icon}</span>
      <p className="text-[13px] leading-snug text-foreground">{children}</p>
    </div>
  );
}
