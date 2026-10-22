import type { Metadata } from "next";
import { Suspense } from "react";
import { LiveAlerts } from "@/components/notifications/live-alerts";

export const metadata: Metadata = { title: "Live alerts" };

export default function Page() {
  return (
    <Suspense>
      <LiveAlerts />
    </Suspense>
  );
}
