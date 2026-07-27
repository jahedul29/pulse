"use client";

import { use } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AvailabilityEditor } from "@/components/availability/availability-editor";
import { useSpecialistStore } from "@/lib/specialists";

export default function SpecialistAvailabilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const specialist = useSpecialistStore((s) => s.specialists.find((x) => x.id === id));

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/personnel"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        All specialists
      </Link>

      {!specialist ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <h2 className="font-heading text-xl font-semibold">Specialist not found</h2>
          <p className="text-sm text-muted-foreground">
            This specialist may have been removed in this session.
          </p>
        </div>
      ) : (
        <AvailabilityEditor key={specialist.id} specialist={specialist} />
      )}
    </div>
  );
}
