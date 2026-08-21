import type { Metadata } from "next";
import { LoginAuditLog } from "@/components/admin/login-audit-log";

export const metadata: Metadata = { title: "Login audit" };

export default function Page() {
  return <LoginAuditLog />;
}
