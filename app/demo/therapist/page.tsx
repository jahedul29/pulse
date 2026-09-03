"use client";

import { AvailabilityEditor } from "@/components/availability/availability-editor";
import { useSpecialistStore } from "@/lib/specialists";

export default function TherapistDemoPage() {
  const specialist = useSpecialistStore((state) => state.specialists.find((x) => x.role === "therapist"));

  if (!specialist) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        No therapist configured.
      </div>
    );
  }

  return <AvailabilityEditor key={specialist.id} specialist={specialist} />;
}
