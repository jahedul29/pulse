import { Suspense } from "react";
import type { Metadata } from "next";
import { RegionBuilder } from "@/components/locations/region-builder";

export const metadata: Metadata = { title: "Region builder" };

export default function RegionBuilderPage() {
  return (
    <Suspense>
      <RegionBuilder />
    </Suspense>
  );
}
