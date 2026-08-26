import type { Metadata } from "next";
import { NotificationLog } from "@/components/notifications/notification-log";

export const metadata: Metadata = { title: "Notification log" };

export default function Page() {
  return <NotificationLog />;
}
