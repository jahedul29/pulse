import type { Metadata } from "next";
import { Suspense } from "react";
import { ChangeLog } from "@/components/admin/change-log";

export const metadata: Metadata = { title: "Change log" };

export default function Page() {
  return (
    <Suspense>
      <ChangeLog />
    </Suspense>
  );
}
