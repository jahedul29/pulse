import type { Metadata } from "next";
import { UserManagement } from "@/components/admin/user-management";

export const metadata: Metadata = { title: "Admin accounts" };

export default function Page() {
  return <UserManagement />;
}
