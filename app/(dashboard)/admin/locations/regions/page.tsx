import { Suspense } from "react";
import type { Metadata } from "next";
import { RegionsList } from "@/components/locations/regions-list";
import { PageContainer } from "@/components/common/page-container";

export const metadata: Metadata = { title: "Regions" };

export default function RegionsPage() {
  return (
    <PageContainer className="flex flex-col gap-6">
      <Suspense>
        <RegionsList />
      </Suspense>
    </PageContainer>
  );
}
