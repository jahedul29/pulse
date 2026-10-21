import { Suspense } from "react";
import { Sidebar } from "@/components/nav/sidebar";
import { Topbar } from "@/components/nav/topbar";
import { MobileNav } from "@/components/nav/mobile-nav";
import { AccessGuard } from "@/components/auth/access-guard";
import { CalendarParametersSync } from "@/components/calendars/calendar-parameters-sync";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh w-full">
      <CalendarParametersSync />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<div className="h-14 border-b" />}>
          <Topbar />
        </Suspense>
        <MobileNav />
        <main className="flex-1 px-4 py-6 md:px-6 has-[[data-full-bleed]]:p-0">
          <AccessGuard>{children}</AccessGuard>
        </main>
      </div>
    </div>
  );
}
