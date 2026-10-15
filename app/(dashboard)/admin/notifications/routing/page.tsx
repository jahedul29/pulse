import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertRoutingEditor } from "@/components/notifications/alert-routing";

export const metadata: Metadata = { title: "Alert routing" };

export default function Page() {
  return (
    <Suspense>
      <AlertRoutingEditor />
    </Suspense>
  );
}
