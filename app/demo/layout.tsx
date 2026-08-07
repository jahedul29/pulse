import { Toaster } from "@/components/ui/sonner";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-background px-4 py-6 md:px-6">
      <div className="mx-auto max-w-5xl">{children}</div>
      <Toaster />
    </div>
  );
}
