"use client";

import { AnnualEditor } from "@/components/annual/annual-editor";
import { useSpecialistStore } from "@/lib/specialists";

export default function TherapistAnnualDemoPage() {
  const specialist = useSpecialistStore((s) => s.specialists.find((x) => x.role === "therapist"));

  if (!specialist) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        No therapist configured.
      </div>
    );
  }

  return <AnnualEditor key={specialist.id} specialist={specialist} />;
}
