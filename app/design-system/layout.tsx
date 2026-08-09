import { Toaster } from "@/components/ui/sonner";

export default function DesignSystemLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
