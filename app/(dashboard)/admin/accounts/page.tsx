import type { Metadata } from "next";
import { AdminAccounts } from "@/components/admin/admin-accounts";

export const metadata: Metadata = { title: "Admin accounts" };

export default function Page() {
  return <AdminAccounts />;
}
