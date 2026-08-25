import type { Metadata } from "next";
import { SecurityPolicyEditor } from "@/components/admin/security-policy";

export const metadata: Metadata = { title: "Security policy" };

export default function Page() {
  return <SecurityPolicyEditor />;
}
