import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarParametersEditor } from "@/components/admin/calendar-parameters";

export const metadata: Metadata = { title: "Calendar settings" };

export default function Page() {
  return (
    <Suspense>
      <CalendarParametersEditor />
    </Suspense>
  );
}
