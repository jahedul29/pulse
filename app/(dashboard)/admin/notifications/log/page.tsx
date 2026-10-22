import type { Metadata } from "next";
import { Suspense } from "react";
import { NotificationLog } from "@/components/notifications/notification-log";

export const metadata: Metadata = { title: "Notification deliveries" };

export default function Page() {
  return (
    <Suspense>
      <NotificationLog />
    </Suspense>
  );
}
