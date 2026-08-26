import type { Metadata } from "next";
import { EdrMapping } from "@/components/notifications/edr-mapping";

export const metadata: Metadata = { title: "EDR mapping" };

export default function Page() {
  return <EdrMapping />;
}
