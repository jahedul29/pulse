"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { SpecialistAnnualCalendar } from "@/components/calendars/specialist-annual-calendar";
import { SpecialistWeeklyCalendar } from "@/components/calendars/specialist-weekly-calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSpecialistStore } from "@/lib/specialists";

const PANEL = "flex flex-col gap-5 text-[length:inherit]";

export default function SpecialistAvailabilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("calendarSettings");
  const specialist = useSpecialistStore((state) => state.specialists.find((x) => x.id === id));

  return (
    <div className="flex flex-col gap-5">
      {!specialist ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <h2 className="font-heading text-xl font-semibold">Specialist not found</h2>
          <p className="text-sm text-muted-foreground">
            This specialist may have been removed in this session.
          </p>
        </div>
      ) : (
        <Tabs defaultValue="weekly" className="gap-5">
          <TabsList>
            <TabsTrigger value="weekly" className="px-3">{t("weekly")}</TabsTrigger>
            <TabsTrigger value="annual" className="px-3">{t("annual")}</TabsTrigger>
          </TabsList>
          <TabsContent value="weekly" className={PANEL}>
            <SpecialistWeeklyCalendar specialist={specialist} adminOverrides />
          </TabsContent>
          <TabsContent value="annual" className={PANEL}>
            <SpecialistAnnualCalendar specialist={specialist} adminOverrides />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
