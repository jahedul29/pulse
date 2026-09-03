"use client";

import { AvailabilityEditor } from "@/components/availability/availability-editor";
import { useSpecialistStore } from "@/lib/specialists";

export default function AnalystDemoPage() {
  const specialist = useSpecialistStore((state) => state.specialists.find((x) => x.role === "analyst"));

  if (!specialist) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">No analyst configured.</div>
    );
  }

  return <AvailabilityEditor key={specialist.id} specialist={specialist} />;
}
