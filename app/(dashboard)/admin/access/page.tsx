import type { Metadata } from "next";
import { AdminAccess } from "@/components/admin/admin-access";

export const metadata: Metadata = { title: "Admin access" };

export default function Page() {
  return <AdminAccess />;
}
