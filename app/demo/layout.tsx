import { CalendarParametersSync } from "@/components/calendars/calendar-parameters-sync";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-background px-4 py-6 md:px-6">
      <CalendarParametersSync />
      <div className="mx-auto max-w-5xl">{children}</div>
    </div>
  );
}
