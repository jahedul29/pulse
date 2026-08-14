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
import type { RuleConfig, SpecialistType } from "@/lib/availability/types";

function Hl({ children }: { children: ReactNode }) {
  return <span className="font-semibold text-primary">{children}</span>;
}

function GIcon({ src }: { src: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/icons/guidelines/${src}.svg`} alt="" className="size-8 shrink-0" />;
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
      <DialogContent
        showCloseButton={false}
        className="w-[345px] max-w-[345px] font-manrope theme-violet sm:max-w-[345px] md:w-[390px] md:max-w-[390px]"
      >
        <div className="relative shrink-0 border-b px-4 pt-6 pb-3">
          <DialogTitle className="text-center text-sm leading-snug font-bold text-balance text-foreground md:text-base">
            {ROLE_TITLE[role]}
          </DialogTitle>
          <DialogClose
            aria-label="Close"
            className="absolute top-1.5 right-1.5 grid size-5 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none md:size-6"
          >
            <X className="size-3.5 md:size-4" />
          </DialogClose>
        </div>

        <DialogBody className="p-5 text-center text-xs font-semibold text-foreground/80 md:text-sm">
          <div className="flex flex-col gap-4">
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
                That&apos;s why setting up your availability correctly
                <br />
                throughout the day is crucial.
              </p>
              <p>
                As an analyst, select whether you&apos;ll supervise
                <br />
                <Hl>in-person</Hl> at the client&apos;s location, <Hl>online</Hl> from
                <br />
                anywhere, or a mix of both. You can combine both
                <br />
                types throughout your day.
              </p>
              <p>
                First, if you need a weekly break, select up to
                <br />
                {config.maxDaysOff} <Hl>DAYS OFF</Hl>. You can still set custom work hours for
                <br />
                these days if you like. For all other days, your
                <br />
                personalized workday rules will apply.
              </p>

              <GuidelineCard icon={<GIcon src="clock-dollar" />}>
                For <Hl>WORKDAYS</Hl> your schedule will be the
                <br />
                same. Ensure your workdays have at least
                <br />
                one <Hl>continuous 3-hour window</Hl> available
                <br />
                for supervision (in-person or online).
              </GuidelineCard>

              <GuidelineCard icon={<GIcon src="clock-cog" />}>
                Any availability slots must be at least
                <br />
                <Hl>1 hour</Hl> for in-person and <Hl>30 min</Hl> for online
                <br />
                supervision. Any breaks between
                <br />
                availability slots can be <Hl>15 min</Hl> or longer.
              </GuidelineCard>

              <GuidelineCard icon={<GIcon src="calendar-clock" />}>
                We prevent double-booking, but sessions
                <br />
                can be <Hl>back-to-back</Hl>. Please plan your
                <br />
                schedule to ensure you arrive on time at
                <br />
                the client&apos;s location for in-person sessions.
              </GuidelineCard>
            </>
          )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            size="lg"
            className="mx-auto h-9 w-[200px] rounded-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90 sm:h-10 sm:w-[250px]"
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
