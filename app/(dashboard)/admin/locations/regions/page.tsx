import { Suspense } from "react";
import type { Metadata } from "next";
import { RegionsList } from "@/components/locations/regions-list";

export const metadata: Metadata = { title: "Regions" };

export default function RegionsPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <Suspense>
        <RegionsList />
      </Suspense>
    </div>
  );
}
