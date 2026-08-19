import type { Metadata } from "next";
import { SpecialistsTable } from "@/components/personnel/specialists-table";

export const metadata: Metadata = { title: "Specialists" };

export default function Page() {
  return <SpecialistsTable />;
}
