import type { Metadata } from "next";
import { Suspense } from "react";
import { UserManagement } from "@/components/admin/user-management";

export const metadata: Metadata = { title: "User accounts" };

export default function Page() {
  return (
    <Suspense>
      <UserManagement />
    </Suspense>
  );
}
