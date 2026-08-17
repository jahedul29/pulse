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
import type { SpecialistType } from "@/lib/availability/types";

function Hl({ children }: { children: ReactNode }) {
  return <span className="font-semibold text-primary">{children}</span>;
}

function GIcon({ src }: { src: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/icons/guidelines/${src}.svg`} alt="" className="size-8 shrink-0" />;
}

function Sq({ color }: { color: "completed" | "scheduled" }) {
  return (
    <span
      className={`ml-0.5 inline-block size-2.5 rounded-[3px] align-middle ${
        color === "completed" ? "bg-chart-3" : "bg-primary"
      }`}
    />
  );
}

const ROLE_TITLE: Record<SpecialistType, string> = {
  therapist: "Setting up Therapist annual work calendar",
  analyst: "Setting up Analyst annual work calendar",
};

export function AnnualGuidelinesDialog({
  open,
  onOpenChange,
  role,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: SpecialistType;
}) {
  const analyst = role === "analyst";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="theme-violet w-[345px] max-w-[345px] font-manrope sm:max-w-[345px] md:w-[390px] md:max-w-[390px]"
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
            <p>
              We strive to make you and your Clients happy.
              <br />
              Thus, each calendar year you can select
              <br />
              <Hl>up to 56 calendar days (MO-SU) as days off</Hl>
              <br />
              to make yourself unavailable for booking.
            </p>

            {analyst && (
              <>
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
              </>
            )}

            <GuidelineCard icon={<GIcon src="calendar-dots" />}>
              You can select days off only in the future
              <br />
              and only in those weeks during which you
              <br />
              have <Hl>no bookings</Hl>, completed <Sq color="completed" /> or
              <br />
              scheduled <Sq color="scheduled" />
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
