"use client";

import { AnnualEditor } from "@/components/annual/annual-editor";
import { useSpecialistStore } from "@/lib/specialists";

export default function AnalystAnnualDemoPage() {
  const specialist = useSpecialistStore((s) => s.specialists.find((x) => x.role === "analyst"));

  if (!specialist) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">No analyst configured.</div>
    );
  }

  return <AnnualEditor key={specialist.id} specialist={specialist} />;
}
