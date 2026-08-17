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
import type { RuleConfig, SpecialistType } from "@/lib/availability/types";

function Hl({ children }: { children: ReactNode }) {
  return <span className="font-semibold text-primary">{children}</span>;
}

function GIcon({ src }: { src: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/icons/guidelines/${src}.svg`} alt="" className="size-8 shrink-0" />;
}

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
  const t = useTranslations();
  const therapist = role === "therapist";
  const hl = { hl: (chunks: ReactNode) => <Hl>{chunks}</Hl> };
  const off = { ...hl, maxDaysOff: config.maxDaysOff };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[345px] max-w-[345px] font-manrope theme-violet sm:max-w-[345px] md:w-[390px] md:max-w-[390px]"
      >
        <div className="relative shrink-0 border-b px-4 pt-6 pb-3">
          <DialogTitle className="text-center text-sm leading-snug font-bold text-balance text-foreground md:text-base">
            {t(therapist ? "guidelines.weeklyTitleTherapist" : "guidelines.weeklyTitleAnalyst")}
          </DialogTitle>
          <DialogClose
            aria-label={t("common.close")}
            className="absolute top-1.5 end-1.5 grid size-5 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none md:size-6"
          >
            <X className="size-3.5 md:size-4" />
          </DialogClose>
        </div>

        <DialogBody className="p-5 text-center text-xs font-semibold text-foreground/80 md:text-sm">
          <div className="flex flex-col gap-4">
            <p>{t.rich("guidelines.weekly.p1", hl)}</p>

            {therapist ? (
              <>
                <p>{t.rich("guidelines.weekly.therapistP2", hl)}</p>
                <p>{t.rich("guidelines.weekly.therapistP3", off)}</p>
                <GuidelineCard icon={<GIcon src="clock-dollar" />}>
                  {t.rich("guidelines.weekly.therapistCard1", hl)}
                </GuidelineCard>
                <GuidelineCard icon={<GIcon src="clock-cog" />}>
                  {t.rich("guidelines.weekly.therapistCard2", hl)}
                </GuidelineCard>
                <GuidelineCard icon={<GIcon src="calendar-star" />}>
                  {t.rich("guidelines.weekly.therapistCard3", hl)}
                </GuidelineCard>
              </>
            ) : (
              <>
                <p>{t.rich("guidelines.weekly.analystP2", hl)}</p>
                <p>{t.rich("guidelines.weekly.analystP3", off)}</p>
                <GuidelineCard icon={<GIcon src="clock-dollar" />}>
                  {t.rich("guidelines.weekly.analystCard1", hl)}
                </GuidelineCard>
                <GuidelineCard icon={<GIcon src="clock-cog" />}>
                  {t.rich("guidelines.weekly.analystCard2", hl)}
                </GuidelineCard>
                <GuidelineCard icon={<GIcon src="calendar-clock" />}>
                  {t.rich("guidelines.weekly.analystCard3", hl)}
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
