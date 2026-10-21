import type { Metadata } from "next";
import { CountriesList } from "@/components/locations/countries-list";
import { PageContainer } from "@/components/common/page-container";

export const metadata: Metadata = { title: "Countries" };

export default function CountriesPage() {
  return (
    <PageContainer className="flex flex-col gap-6">
      <CountriesList />
    </PageContainer>
  );
}
