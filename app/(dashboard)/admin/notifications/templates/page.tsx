import type { Metadata } from "next";
import { MessageTemplates } from "@/components/notifications/message-templates";

export const metadata: Metadata = { title: "Message templates" };

export default function Page() {
  return <MessageTemplates />;
}
