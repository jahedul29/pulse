"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { LogOut, MonitorSmartphone } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuthStore } from "@/lib/auth/store";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ProfileMenu() {
  const t = useTranslations("auth");
  const ts = useTranslations("sessions");
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const signOut = useAuthStore((state) => state.signOut);
  const [open, setOpen] = useState(false);

  if (!session) return null;

  const initials = initialsOf(session.name);

  const onSignOut = () => {
    setOpen(false);
    signOut();
    toast.success(t("signedOut"));
    router.replace("/login");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={t("accountMenu")}
        className="grid size-9 cursor-pointer place-items-center rounded-full bg-primary/12 font-heading text-xs font-semibold text-primary ring-1 ring-primary/20 transition-colors hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none data-[popup-open]:bg-primary/20"
      >
        {initials}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 gap-0 p-0">
        <div className="flex items-center gap-3 p-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/12 font-heading text-sm font-semibold text-primary ring-1 ring-primary/20">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground">{session.name}</div>
            <div className="truncate text-xs text-muted-foreground">{session.email}</div>
          </div>
        </div>
        <div className="px-3 pb-2.5">
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {session.role}
          </span>
        </div>
        <div className="border-t p-1">
          <Link
            href="/admin/settings/sessions"
            onClick={() => setOpen(false)}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
          >
            <MonitorSmartphone className="size-4" />
            {ts("menuLabel")}
          </Link>
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-danger/10 hover:text-danger focus-visible:bg-danger/10 focus-visible:text-danger focus-visible:outline-none"
          >
            <LogOut className="size-4 rtl:-scale-x-100" />
            {t("signOut")}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
