"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RuleConfig, SpecialistType } from "@/lib/availability/types";

function Hl({ children }: { children: ReactNode }) {
  return <span className="font-semibold text-primary">{children}</span>;
}

function GIcon({ src }: { src: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/icons/guidelines/${src}.svg`} alt="" className="size-8 shrink-0" />;
}

function Dot({ className }: { className: string }) {
  return <span className={cn("inline-block size-3 rounded-full align-middle", className)} />;
}

const ROLE_TITLE: Record<SpecialistType, string> = {
  therapist: "Setting up Therapist weekly business hours",
  analyst: "Setting up Analyst annual work calendar",
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
      <DialogContent
        showCloseButton={false}
        className="w-[345px] max-w-[345px] font-manrope theme-violet sm:max-w-[345px] md:w-full md:max-w-md"
      >
        <div className="relative shrink-0 border-b px-12 pt-4 pb-3">
          <DialogTitle className="text-center text-lg leading-snug font-bold text-balance text-foreground">
            {ROLE_TITLE[role]}
          </DialogTitle>
          <DialogClose
            aria-label="Close"
            className="absolute top-3 right-3 grid size-7 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
          >
            <X className="size-4" />
          </DialogClose>
        </div>

        <DialogBody className="flex flex-col gap-4 p-5 text-center text-xs font-semibold text-foreground/80 md:text-sm">
          {therapist ? (
            <>
              <p>
                We strive to make you and your Clients happy.
                <br />
                That&apos;s why setting up your availability correctly
                <br />
                throughout the day is crucial.
              </p>
              <p>
                Pick how long you need to get between clients
                <br />
                (min. <Hl>00h45m</Hl> for your location). Do this first!
                <br />
                Changing it later resets your calendar settings.
                <br />
                Travel time becomes locked after your first booking.
              </p>
              <p>
                Need a break? Grab up to {config.maxDaysOff} any <Hl>DAYS OFF</Hl> a week.
                <br />
                You can set custom work hours for these days if you
                <br />
                want. For other days your workday rules will apply.
              </p>

              <GuidelineCard icon={<GIcon src="clock-dollar" />}>
                Schedule for all <Hl>WORKDAYS</Hl> will be the
                <br />
                same. Make sure your workdays have at
                <br />
                least one{" "}
                <Hl>
                  continuous window of at least 6
                  <br />
                  hours
                </Hl>{" "}
                when you&apos;re available for bookings.
              </GuidelineCard>

              <GuidelineCard icon={<GIcon src="clock-cog" />}>
                Any other <Hl>availability</Hl> slots must be{" "}
                <Hl>
                  at least
                  <br />1 hour
                </Hl>{" "}
                long. Also, the <Hl>breaks</Hl> you take
                <br />
                between your availability slots cannot be
                <br />
                shorter than your chosen travel time.
              </GuidelineCard>

              <GuidelineCard icon={<GIcon src="calendar-star" />}>
                To keep your rating high and prevent
                <br />
                double-booking, we automatically{" "}
                <Hl>
                  add
                  <br />
                  travel time
                </Hl>{" "}
                to every session. You&apos;ll only
                <br />
                ever be booked for <Hl>one client at a time</Hl>.
              </GuidelineCard>
            </>
          ) : (
            <>
              <p>
                We strive to make you and your Clients happy.
                <br />
                Thus, each calendar year you can select
                <br />
                <Hl>up to 56 calendar days (MO-SU) as days off</Hl>
                <br />
                to make yourself unavailable for booking.
              </p>

              <GuidelineCard icon={<GIcon src="calendar-day-off" />}>
                You can take a{" "}
                <Hl>
                  maximum of
                  <br />
                  28 consecutive days off
                </Hl>
              </GuidelineCard>

              <GuidelineCard icon={<GIcon src="calendar-agenda" />}>
                The interval between any non-consecutive
                <br />
                days off must be at least{" "}
                <Hl>
                  4 full calendar
                  <br />
                  weeks from MO to SU
                </Hl>
              </GuidelineCard>

              <GuidelineCard icon={<GIcon src="calendar-dots" />}>
                You can select days off only in the future
                <br />
                and only in those weeks during which you
                <br />
                have <Hl>no bookings</Hl>, completed <Dot className="bg-chart-3 rounded-[4px]" /> or
                <br />
                scheduled <Dot className="bg-primary rounded-[4px]" />
              </GuidelineCard>

              <GuidelineCard icon={<GIcon src="users" />}>
                While you can adjust your annual work
                <br />
                calendar at any time, we recommend that
                <br />
                you always{" "}
                <Hl>
                  discuss and agree on vacation
                  <br />
                  times with your Clients
                </Hl>
              </GuidelineCard>
            </>
          )}
        </DialogBody>

        <DialogFooter>
          <Button
            className="w-full rounded-full bg-primary hover:bg-primary/90"
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
    <div className="flex items-center gap-2 rounded-xl border py-3 pr-2 pl-1.5 text-left">
      {icon}
      <p className="text-xs leading-snug text-foreground md:text-sm">{children}</p>
    </div>
  );
}
