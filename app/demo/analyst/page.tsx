"use client";

import { SpecialistWeeklyCalendar } from "@/components/calendars/specialist-weekly-calendar";
import { useSpecialistStore } from "@/lib/specialists";

export default function AnalystDemoPage() {
  const specialist = useSpecialistStore((state) => state.specialists.find((x) => x.role === "analyst"));

  if (!specialist) {
    return <div className="py-24 text-center text-sm text-muted-foreground">No analyst configured.</div>;
  }

  return <SpecialistWeeklyCalendar specialist={specialist} />;
}
