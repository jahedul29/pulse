import type { Metadata } from "next";
import { SessionManager } from "@/components/admin/session-manager";

export const metadata: Metadata = { title: "Active sessions" };

export default function Page() {
  return <SessionManager />;
}
