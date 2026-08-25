import type { Metadata } from "next";
import { ActionLog } from "@/components/admin/action-log";

export const metadata: Metadata = { title: "Action log" };

export default function Page() {
  return <ActionLog />;
}
