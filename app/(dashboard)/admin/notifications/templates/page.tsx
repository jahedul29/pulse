import type { Metadata } from "next";
import { Suspense } from "react";
import { MessageTemplates } from "@/components/notifications/message-templates";

export const metadata: Metadata = { title: "Message templates" };

export default function Page() {
  return (
    <Suspense>
      <MessageTemplates />
    </Suspense>
  );
}
