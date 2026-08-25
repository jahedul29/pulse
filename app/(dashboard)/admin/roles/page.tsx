import type { Metadata } from "next";
import { RolesList } from "@/components/admin/roles-list";

export const metadata: Metadata = { title: "Roles" };

export default function Page() {
  return <RolesList />;
}
