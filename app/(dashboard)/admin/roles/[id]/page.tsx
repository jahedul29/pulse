import type { Metadata } from "next";
import { PermissionMatrix } from "@/components/admin/permission-matrix";

export const metadata: Metadata = { title: "Role permissions" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PermissionMatrix roleId={id} />;
}
