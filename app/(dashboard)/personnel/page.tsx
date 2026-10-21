import type { Metadata } from "next";
import { PageContainer } from "@/components/common/page-container";
import { SpecialistsTable } from "@/components/personnel/specialists-table";

export const metadata: Metadata = { title: "Specialists" };

export default function Page() {
  return (
    <PageContainer>
      <SpecialistsTable />
    </PageContainer>
  );
}
