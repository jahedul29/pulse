"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
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
      className={`ms-0.5 inline-block size-2.5 rounded-[3px] align-middle ${
        color === "completed" ? "bg-chart-3" : "bg-primary"
      }`}
    />
  );
}

export function AnnualGuidelinesDialog({
  open,
  onOpenChange,
  role,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: SpecialistType;
}) {
  const t = useTranslations();
  const analyst = role === "analyst";
  const tags = {
    hl: (chunks: ReactNode) => <Hl>{chunks}</Hl>,
    sqCompleted: () => <Sq color="completed" />,
    sqScheduled: () => <Sq color="scheduled" />,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[345px] max-w-[345px] font-manrope sm:max-w-[345px] md:w-[390px] md:max-w-[390px]"
      >
        <div className="relative shrink-0 border-b px-4 pt-6 pb-3">
          <DialogTitle className="text-center text-sm leading-snug font-bold text-balance text-foreground md:text-base">
            {t(analyst ? "guidelines.annualTitleAnalyst" : "guidelines.annualTitleTherapist")}
          </DialogTitle>
          <DialogClose
            aria-label="Close"
            className="absolute top-1.5 end-1.5 grid size-5 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none md:size-6"
          >
            <X className="size-3.5 md:size-4" />
          </DialogClose>
        </div>

        <DialogBody className="p-5 text-center text-xs font-semibold text-foreground/80 md:text-sm">
          <div className="flex flex-col gap-4">
            <p>{t.rich("guidelines.annual.intro", tags)}</p>

            {analyst && (
              <>
                <GuidelineCard icon={<GIcon src="calendar-day-off" />}>
                  {t.rich("guidelines.annual.cardConsecutive", tags)}
                </GuidelineCard>

                <GuidelineCard icon={<GIcon src="calendar-agenda" />}>
                  {t.rich("guidelines.annual.cardInterval", tags)}
                </GuidelineCard>
              </>
            )}

            <GuidelineCard icon={<GIcon src="calendar-dots" />}>
              {t.rich("guidelines.annual.cardBookings", tags)}
            </GuidelineCard>

            <GuidelineCard icon={<GIcon src="users" />}>
              {t.rich("guidelines.annual.cardDiscuss", tags)}
            </GuidelineCard>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            size="lg"
            className="mx-auto h-9 w-[200px] rounded-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90 sm:h-10 sm:w-[250px]"
            onClick={() => onOpenChange(false)}
          >
            {t("common.ok")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GuidelineCard({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border py-3 pe-2 ps-1.5 text-start">
      {icon}
      <p className="text-xs leading-snug text-foreground md:text-sm">{children}</p>
    </div>
  );
}
