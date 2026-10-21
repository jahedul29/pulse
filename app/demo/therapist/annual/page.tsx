"use client";

import { SpecialistAnnualCalendar } from "@/components/calendars/specialist-annual-calendar";
import { useSpecialistStore } from "@/lib/specialists";

export default function TherapistAnnualDemoPage() {
  const specialist = useSpecialistStore((state) => state.specialists.find((x) => x.role === "therapist"));

  if (!specialist) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">No therapist configured.</div>
    );
  }

  return <SpecialistAnnualCalendar specialist={specialist} />;
}
